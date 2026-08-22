import { useQuery } from "@tanstack/react-query";

import { authFeaturesQueryKey, fetchAuthFeatures } from "@/lib/auth-features";

export function useAuthFeatures() {
	return useQuery({
		queryKey: authFeaturesQueryKey,
		queryFn: fetchAuthFeatures,
	});
}
