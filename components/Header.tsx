import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import ConnectButton from "@/components/ConnectButton"

export default function Header() {
  return (
    <header className="border-b p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input 
            className="max-w-lg" 
            placeholder="Search in Drive" 
            type="search" 
          />
        </div>
        <div className="flex items-center">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
} 