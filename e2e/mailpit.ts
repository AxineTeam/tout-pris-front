const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface Message {
	ID: string;
	To: { Address: string }[];
}

async function messages(): Promise<Message[]> {
	const response = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=200`);
	return (await response.json()).messages ?? [];
}

async function text(id: string): Promise<string> {
	const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
	return (await response.json()).Text ?? '';
}

export async function waitForPath(address: string, contains: string): Promise<string> {
	for (let attempt = 0; attempt < 60; attempt++) {
		for (const message of await messages()) {
			if (!message.To.some((recipient) => recipient.Address === address)) continue;
			const link = (await text(message.ID)).match(new RegExp(`https?://\\S*${contains}\\S*`));
			if (link) return new URL(link[0]).pathname;
		}
		await new Promise((wait) => setTimeout(wait, 250));
	}
	throw new Error(`Aucun email vers ${address} contenant ${contains}`);
}

export async function forget(address: string): Promise<void> {
	const ids = (await messages())
		.filter((message) => message.To.some((recipient) => recipient.Address === address))
		.map((message) => message.ID);
	if (ids.length === 0) return;
	await fetch(`${MAILPIT_URL}/api/v1/messages`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ IDs: ids })
	});
}
