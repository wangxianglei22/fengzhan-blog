import { authenticate, corsHeaders, json, type Context } from "./_shared";

export const onRequestGet = async ({ request, env }: Context) => {
	const user = await authenticate(request, env);
	return json({ authenticated: Boolean(user), user }, 200, corsHeaders);
};
