import { Loader } from "lucide-react";

const DashboardLoading = () => {
    return (
        <div className="flex items-center justify-center min-h-full">
            <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
    );
};

export default DashboardLoading;
