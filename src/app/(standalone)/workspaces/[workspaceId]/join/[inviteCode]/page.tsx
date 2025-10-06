import { getCurrent } from "@/features/auth/queries";
import { JoinWorkspaceForm } from "@/features/workspaces/components/join-workspace-form";
import { getWorkspaceInfo } from "@/features/workspaces/queries";
import { redirect } from "next/navigation";

interface WorkspaceIdJoinPageProps {
    params: Promise<{
        workspaceId: string;
        inviteCode: string;
    }>;
}

const WorkspaceJoinPage = async ({ params }: WorkspaceIdJoinPageProps) => {
    const user = await getCurrent();
    if (!user) {
        redirect("/sign-in");
    }

    // Await params before accessing its properties
    const { workspaceId, inviteCode } = await params;

    const initialValue = await getWorkspaceInfo({
        workspaceId: workspaceId,
    });

    if (!initialValue) {
        redirect("/");
    }

    return (
        <div className="w-full lg:max-w-xl">
            <JoinWorkspaceForm initialValues={initialValue} />
        </div>
    );
};

export default WorkspaceJoinPage;