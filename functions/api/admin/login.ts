import { login, type Context } from "./_shared";

export const onRequestPost = ({ request, env }: Context) => login(request, env);
