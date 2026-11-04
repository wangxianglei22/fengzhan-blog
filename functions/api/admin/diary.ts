import { authenticate, corsHeaders, handleError, json, listEntries, saveEntry, unauthorized, type Context } from "./_shared";

export const onRequestGet = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		return json(await listEntries(env, "diary"), 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestPost = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const payload = await request.json() as Record<string, unknown>;
		return json(await saveEntry(env, "diary", payload), 201, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
