import { logout, type Context } from "./_shared";

export const onRequestPost = ({ request }: Context) => logout(request);
