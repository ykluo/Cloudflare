/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { parse } from "cookie";

export default {
	async fetch(request, env, ctx) {
		console.log(request.url);
		const url = new URL(request.url);
		const paths = url.pathname.split("/").filter(element => element);
		if (paths[0] == "secure" && paths[1] == null ) {

			// Get the authorized user email from request cookie, through
			// the CF_Authorization field, and parse and decode the JWT
			const cookie = parse(request.headers.get("Cookie") || "");
			const token = cookie["CF_Authorization"];
			if (token == null) {
				return new Response("No CF_Authorization found from cookie", { status: 404 });
			}
			const json = JSON.parse(atob(token.split('.')[1]));
			const email = json.email;

			// Get country and timestamp
			const country = request.cf.country;
			const timestamp =  Date.now();
			const redirect_url = "/secure/" + country;
			const html = `<!DOCTYPE html>
			<body>
				<p>${email} authenticated at ${timestamp} from <a href=${redirect_url}>${country}</a>.</p>
			</body>
			`;
			return new Response(html, {
				headers: {
					"content-type": "text/html;charset=UTF-8",
				},
			});
		} 
		else {
			console.log(paths);
			const file_key = paths[1] + ".png";
			console.log("Getting file from R2 with key: " + file_key.toLowerCase());

			// Query the files from R2 bucket named country_flags
			const object = await env.country_flags.get(file_key.toLowerCase());

			if (object == null) {
				return new Response("Object Not Found", { status: 404 });
			}

			// Display the country flag image as PNG file
			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set("etag", object.httpEtag);
			return new Response(object.body, {
				headers,
			});
		}
	},
};

