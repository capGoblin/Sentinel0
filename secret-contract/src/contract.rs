use crate::{
    msg::{
        ExecuteMsg, GatewayMsg, InputRetrieveMsg, InputStoreMsg, InstantiateMsg, QueryMsg,
        ResponseRetrieveMsg, ResponseStoreMsg, ResponseRetrieveKeysMsg, ResponseRetrieveAllKeysMsg,
    },
    state::{State, StorageItem, CONFIG, KV_MAP},
};
use anybuf::Anybuf;
use base64::{engine::general_purpose::STANDARD, Engine};
use cosmwasm_std::{
    entry_point, to_binary, to_vec, Binary, ContractResult, Deps, DepsMut, Env, MessageInfo,
    Response, StdError, StdResult, SystemResult,
};
use secret_path::{
    msg::{PostExecutionMsg, PrivContractHandleMsg},
    state::Task,
};
use secret_toolkit::{
    crypto::sha_256,
    utils::{pad_handle_result, pad_query_result, HandleCallback},
};

/// pad handle responses and log attributes to blocks of 256 bytes to prevent leaking info based on
/// response size
pub const BLOCK_SIZE: usize = 256;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let state = State {
        gateway_address: msg.gateway_address,
        gateway_hash: msg.gateway_hash,
        gateway_key: msg.gateway_key,
    };

    CONFIG.save(deps.storage, &state)?;

    Ok(Response::default())
}

#[entry_point]
pub fn execute(deps: DepsMut, env: Env, info: MessageInfo, msg: ExecuteMsg) -> StdResult<Response> {
    let response = match msg {
        ExecuteMsg::Input { message } => try_handle(deps, env, info, message),
    };
    pad_handle_result(response, BLOCK_SIZE)
}

// acts like a gateway message handle filter
fn try_handle(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: PrivContractHandleMsg,
) -> StdResult<Response> {
    // verify signature with stored gateway public key

    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.gateway_address {
        return Err(StdError::generic_err(
            "Only SecretPath Gateway can call this function",
        ));
    }

    deps.api
        .secp256k1_verify(
            msg.input_hash.as_slice(),
            msg.signature.as_slice(),
            config.gateway_key.as_slice(),
        )
        .map_err(|err| StdError::generic_err(err.to_string()))?;

    // combine input values and task to create verification hash, once with the unsafe_payload flag = true and once = falsecargo
    let input_hash_safe = sha_256(
        &[
            msg.input_values.as_bytes(),
            msg.task.task_id.as_bytes(),
            &[0u8],
        ]
        .concat(),
    );
    let input_hash_unsafe = sha_256(
        &[
            msg.input_values.as_bytes(),
            msg.task.task_id.as_bytes(),
            &[1u8],
        ]
        .concat(),
    );

    if msg.input_hash.as_slice() != input_hash_safe.as_slice() {
        if msg.input_hash.as_slice() == input_hash_unsafe.as_slice() {
            return Err(StdError::generic_err(
                "Payload was marked as unsafe, not executing",
            ));
        }
        return Err(StdError::generic_err(
            "Safe input hash does not match provided input hash",
        ));
    }

    // determine which function to call based on the included handle
    let handle = msg.handle.as_str();
    match handle {
        "store_value" => store_value(deps, env, msg.input_values, msg.task, msg.input_hash),
        "retrieve_value" => retrieve_value(deps, env, msg.input_values, msg.task, msg.input_hash),
        "change_value" => change_value(deps, env, msg.input_values, msg.task, msg.input_hash),
        _ => Err(StdError::generic_err("invalid handle".to_string())),
    }
}

fn store_value(
    deps: DepsMut,
    _env: Env,
    input_values: String,
    task: Task,
    input_hash: Binary,
) -> StdResult<Response> {
    let config = CONFIG.load(deps.storage)?;

    let input: InputStoreMsg = serde_json_wasm::from_str(&input_values)
        .map_err(|err| StdError::generic_err(err.to_string()))?;

    // create a task information store
    let storage_item = StorageItem {
        value: input.value,
        viewing_key: input.viewing_key,
    };

    let map_contains_kv = KV_MAP.contains(deps.storage, &input.key);

    if map_contains_kv {
        return Err(StdError::generic_err(
            "Stored value already exists, not executing again",
        ));
    }

    // map task to task info
    KV_MAP.insert(deps.storage, &input.key, &storage_item)?;

    let data = ResponseStoreMsg {
        key: input.key.to_string(),
        message: "Value store completed successfully".to_string(),
    };

    // Serialize the struct to a JSON string1
    let json_string =
        serde_json_wasm::to_string(&data).map_err(|err| StdError::generic_err(err.to_string()))?;

    // Encode the JSON string to base64
    let result = STANDARD.encode(json_string);

    // Get the contract's code hash using the gateway address
    let gateway_code_hash = get_contract_code_hash(deps, config.gateway_address.to_string())?;

    let callback_msg = GatewayMsg::Output {
        outputs: PostExecutionMsg {
            result,
            task,
            input_hash,
        },
    }
    .to_cosmos_msg(gateway_code_hash, config.gateway_address.to_string(), None)?;

    Ok(Response::new()
        .add_message(callback_msg)
        .add_attribute("status", "stored value with key"))
}

fn change_value(
    deps: DepsMut,
    _env: Env,
    input_values: String,
    task: Task,
    input_hash: Binary,
) -> StdResult<Response> {
    let config = CONFIG.load(deps.storage)?;

    let input: InputStoreMsg = serde_json_wasm::from_str(&input_values)
        .map_err(|err| StdError::generic_err(err.to_string()))?;

    let value = KV_MAP
        .get(deps.storage, &input.key)
        .ok_or_else(|| StdError::generic_err("Value for this key not found"))?;

    if value.viewing_key != input.viewing_key {
        return Err(StdError::generic_err(
            "Viewing Key incorrect or not found, not allowed to change value",
        ));
    }

    // create a task information store
    let storage_item = StorageItem {
        value: input.value,
        viewing_key: input.viewing_key,
    };

    // Remove old value first
    KV_MAP
        .remove(deps.storage, &input.key)
        .map_err(|err| StdError::generic_err(err.to_string()))?;

    // Insert new value
    KV_MAP
        .insert(deps.storage, &input.key, &storage_item)
        .map_err(|err| StdError::generic_err(err.to_string()))?;

    let data = ResponseStoreMsg {
        key: input.key.to_string(),
        message: "Value store completed successfully".to_string(),
    };

    // Serialize the struct to a JSON string1
    let json_string =
        serde_json_wasm::to_string(&data).map_err(|err| StdError::generic_err(err.to_string()))?;

    // Encode the JSON string to base64
    let result = STANDARD.encode(json_string);

    // Get the contract's code hash using the gateway address
    let gateway_code_hash = get_contract_code_hash(deps, config.gateway_address.to_string())?;

    let callback_msg = GatewayMsg::Output {
        outputs: PostExecutionMsg {
            result,
            task,
            input_hash,
        },
    }
    .to_cosmos_msg(gateway_code_hash, config.gateway_address.to_string(), None)?;

    Ok(Response::new()
        .add_message(callback_msg)
        .add_attribute("status", "stored value with key"))
}

fn retrieve_value(
    deps: DepsMut,
    _env: Env,
    input_values: String,
    task: Task,
    input_hash: Binary,
) -> StdResult<Response> {
    let config = CONFIG.load(deps.storage)?;

    let input: InputRetrieveMsg = serde_json_wasm::from_str(&input_values)
        .map_err(|err| StdError::generic_err(err.to_string()))?;

    let value = KV_MAP
        .get(deps.storage, &input.key)
        .ok_or_else(|| StdError::generic_err("Value for this key not found"))?;

    if value.viewing_key != input.viewing_key {
        return Err(StdError::generic_err("Viewing Key incorrect or not found"));
    }

    let data = ResponseRetrieveMsg {
        key: input.key.to_string(),
        message: "Retrieved value successfully".to_string(),
        value: value.value,
    };

    // Serialize the struct to a JSON string1
    let json_string =
        serde_json_wasm::to_string(&data).map_err(|err| StdError::generic_err(err.to_string()))?;

    // Encode the JSON string to base64
    let result = STANDARD.encode(json_string);

    // Get the contract's code hash using the gateway address
    let gateway_code_hash = get_contract_code_hash(deps, config.gateway_address.to_string())?;

    let callback_msg = GatewayMsg::Output {
        outputs: PostExecutionMsg {
            result,
            task,
            input_hash,
        },
    }
    .to_cosmos_msg(gateway_code_hash, config.gateway_address.to_string(), None)?;

    Ok(Response::new()
        .add_message(callback_msg)
        .add_attribute("status", "stored value with key"))
}

fn get_contract_code_hash(deps: DepsMut, contract_address: String) -> StdResult<String> {
    let code_hash_query: cosmwasm_std::QueryRequest<cosmwasm_std::Empty> =
        cosmwasm_std::QueryRequest::Stargate {
            path: "/secret.compute.v1beta1.Query/CodeHashByContractAddress".into(),
            data: Binary(Anybuf::new().append_string(1, contract_address).into_vec()),
        };

    let raw = to_vec(&code_hash_query).map_err(|serialize_err| {
        StdError::generic_err(format!("Serializing QueryRequest: {}", serialize_err))
    })?;

    let code_hash = match deps.querier.raw_query(&raw) {
        SystemResult::Err(system_err) => Err(StdError::generic_err(format!(
            "Querier system error: {}",
            system_err
        ))),
        SystemResult::Ok(ContractResult::Err(contract_err)) => Err(StdError::generic_err(format!(
            "Querier contract error: {}",
            contract_err
        ))),
        SystemResult::Ok(ContractResult::Ok(value)) => Ok(value),
    }?;

    // Remove the "\n@" if it exists at the start of the code_hash
    let mut code_hash_str = String::from_utf8(code_hash.to_vec())
        .map_err(|err| StdError::generic_err(format!("Invalid UTF-8 sequence: {}", err)))?;

    if code_hash_str.starts_with("\n@") {
        code_hash_str = code_hash_str.trim_start_matches("\n@").to_string();
    }

    Ok(code_hash_str)
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    let response = match msg {
        QueryMsg::RetrieveValue { key, viewing_key } => {
            retrieve_value_query(deps, key, viewing_key)
        },
        QueryMsg::RetrieveKeys { viewing_key } => {
            retrieve_keys_query(deps, viewing_key)
        },
        QueryMsg::RetrieveAllKeys {} => {
            retrieve_all_keys_query(deps)
        }
    };
    pad_query_result(response, BLOCK_SIZE)
}

fn retrieve_value_query(deps: Deps, key: String, viewing_key: String) -> StdResult<Binary> {
    let value = KV_MAP
        .get(deps.storage, &key)
        .ok_or_else(|| StdError::generic_err("Value for this key not found"))?;

    if value.viewing_key != viewing_key {
        return Err(StdError::generic_err("Viewing Key incorrect or not found"));
    }

    to_binary(&ResponseRetrieveMsg {
        key: key.to_string(),
        message: "Retrieved value successfully".to_string(),
        value: value.value,
    })
}

fn retrieve_keys_query(deps: Deps, viewing_key: String) -> StdResult<Binary> {
    // Get all keys from KV_MAP where viewing_key matches
    let matching_keys: Vec<String> = KV_MAP
        .iter(deps.storage)?
        .filter_map(|result| {
            result.ok().and_then(|(key, storage_item)| {
                if storage_item.viewing_key == viewing_key {
                    Some(key)
                } else {
                    None
                }
            })
        })
        .collect();

    to_binary(&ResponseRetrieveKeysMsg {
        keys: matching_keys,
        message: "Retrieved keys successfully".to_string(),
    })
}

fn retrieve_all_keys_query(deps: Deps) -> StdResult<Binary> {
    // Get all keys from KV_MAP without filtering by viewing_key
    let all_keys: Vec<String> = KV_MAP
        .iter(deps.storage)?
        .filter_map(|result| {
            result.ok().map(|(key, _)| key)
        })
        .collect();

    to_binary(&ResponseRetrieveAllKeysMsg {
        keys: all_keys,
        message: "Retrieved all keys successfully".to_string(),
    })
}

