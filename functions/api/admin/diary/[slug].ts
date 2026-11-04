import { authenticate, corsHeaders, getEntry, handleError, json, removeEntry, saveEntry, unauthorized, type Context } from "../_shared";

function slugFromContext(context: Context) {
	return context.params?.slug ? decodeURIComponent(context.params.slug) : "";
}

export const onRequestGet = async (context: Context) => {
	if (!(await authenticate(context.request, context.env))) return unauthorized();
	try {
		const entry = await getEntry(context.env, "diary", slugFromContext(context));
		return entry ? json(entry, 200, corsHeaders) : json({ error: "找不到日记。" }, 404, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestPut = async (context: Context) => {
	if (!(await authenticate(context.request, context.env))) return unauthorized();
	try {
		const payload = await context.request.json() as Record<string, unknown>;
		return json(await saveEntry(context.env, "diary", payload, slugFromContext(context)), 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestDelete = async (context: Context) => {
	if (!(await authenticate(context.request, context.env))) return unauthorized();
	try {
		await removeEntry(context.env, "diary", slugFromContext(context));
		return json({ deleted: true }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
