import { getCurrent } from "@/features/auth/queries";
import { getWorkspace } from "@/features/workspaces/queries";
import { EditWorkspaceForm } from "@/features/workspaces/components/edit-workspace-form";
import { redirect } from "next/navigation";


interface WorkspaceIdSettingsPageProps {
    params: {
        workspaceId: string;
    };
}


const WorkspaceIdSettingsPage = async ({ params }: WorkspaceIdSettingsPageProps) => {
    const { workspaceId } = await params; // 👈 destructure după await

    const user = await getCurrent();
    if (!user) redirect("/sign-in");

    const initialValues = await getWorkspace({ workspaceId });

    if (!initialValues) {
        redirect(`/workspaces/${workspaceId}`);
    }

    return (
        <div className="w-full lg:max-w-xl">
            <EditWorkspaceForm initialValues={initialValues} />
        </div>
    );
};

export default WorkspaceIdSettingsPage;
