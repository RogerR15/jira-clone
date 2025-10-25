import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";




type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["$delete"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks[":taskId"]["$delete"]>;

export const useDeleteTask = () => {

    const queryClient = useQueryClient();

    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({ param }: { param: { taskId: string } }) => {
            const response = await client.api.tasks[":taskId"]["$delete"]({ param: { taskId: param.taskId } });
            if (!response.ok) throw new Error("Task deletion failed");
            return await response.json();
        },

        onSuccess: ({ data }) => {
            toast.success("Task deleted successfully");


            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["task", data.$id] });
        },

        onError: () => {
            toast.error("Failed to delete task");

        }
    });

    return mutation;
};