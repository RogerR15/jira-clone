import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { InferResponseType } from "hono";

import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";

type ResponseType = InferResponseType<typeof client.api.auth.logout["$post"]>;

export const useLogout = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    const mutation = useMutation<
        ResponseType,
        Error
    >({
        mutationFn: async () => {
            const response = await client.api.auth.logout["$post"]();
            if (!response.ok) {
                throw new Error("Logout failed");
            }

            return await response.json();
        },

        onSuccess: () => {
            toast.success("Logout successful");
            router.refresh();

            queryClient.invalidateQueries();

        },

        onError: () => {
            toast.error("Logout failed");
        }
    });

    return mutation;
};