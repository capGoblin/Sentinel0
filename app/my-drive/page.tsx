import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";
import FileList from "@/components/FileList";

export default function Component() {
  return (
    <div className="flex h-screen bg-background ">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <Toolbar />
        <div className="flex-1 ">
          <FileList />
        </div>
      </div>
    </div>
  );
}
