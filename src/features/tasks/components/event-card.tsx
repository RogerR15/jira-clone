import { Project } from "@/features/projects/types";
import { TaskStatus } from "../types";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useRouter } from "next/navigation";


interface EventCardProps {
    title: string;
    assignee: any;
    project: Project | string;
    status: TaskStatus;
    id: string;
}

const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.BACKLOG]: "border-l-pink-500",
    [TaskStatus.TODO]: "border-l-red-500",
    [TaskStatus.IN_PROGRESS]: "border-l-yellow-500",
    [TaskStatus.IN_REVIEW]: "border-l-blue-500",
    [TaskStatus.DONE]: "border-l-emerald-500",
}

export const EventCard = ({ title, assignee, project, status, id }: EventCardProps) => {

    const workspaceId = useWorkspaceId();
    const router = useRouter();

    const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        router.push(`/workspace/${workspaceId}/tasks/${id}`);
    }

    return (
        <div className="px-2">
            <div onClick={onClick} className={cn("p-1.5 text-xs bg-white text-primary border rounded-md border-l-4 flex flex-col gap-y-1.5 cursor-pointer hover:opacity-75 transition",
                statusColors[status])}>
                <p>{title}</p>
                <div className="flex items-center gap-x-1">
                    <MemberAvatar
                        name={typeof assignee === "string" ? assignee : assignee?.name}
                    />
                    <div className="size-1 rounded-full bg-neutral-300" />
                    <ProjectAvatar
                        name={typeof project === "string" ? project : project?.name}
                        image={typeof project === "string" ? undefined : project?.imageUrl}
                    />
                </div>
            </div>
        </div>
    );
}   