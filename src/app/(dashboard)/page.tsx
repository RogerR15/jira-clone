import { getCurrent } from "@/features/auth/actions";
import { UserButton } from "@/features/auth/components/user-button";
import { CreateWorkspaceForm } from "@/features/auth/workspaces/components/create-workspace-form";
import { redirect } from "next/navigation";



const Page = async () => {
  const user = await getCurrent()
  if (!user) redirect("/sign-in");
  return (
    <div>
      <CreateWorkspaceForm />
    </div>
  )
}

export default Page;
