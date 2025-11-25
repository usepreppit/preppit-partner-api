const PUBLIC_KEY = process.env.ILOVE_PDF_PUBLIC_KEY || '';

export async function pluginLogin(): Promise<string> {
    const response = await fetch('https://api.ilovepdf.com/v1/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            public_key: PUBLIC_KEY,
        }),
    });

    if (!response.ok) {
        throw new Error(`Error logging in to iLovePDF: ${response.statusText}`);
    }

    const data = await response.json() as { token: string };
    return data.token;
}


export async function createTask(token: string, tool: string = 'split', region: string = 'eu'): Promise<{ server: string; task: string, remaining_credits: number }> {
    const response = await fetch(`https://api.ilovepdf.com/v1/start/${tool}/${region}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Error creating task in iLovePDF: ${response.statusText}`);
    }
    const data = await response.json() as { server: string; task: string, remaining_credits: number };
    return data;
}


export async function uploadFile(token: string, server: string, cloudUrl: string, task_id: string): Promise<string> {

    console.log('Uploading file to iLovePDF:', { token, server, cloudUrl, task_id });
    const response = await fetch(`https://${server}/v1/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            cloud_file: cloudUrl,
            task: task_id,
        }),
    });

    if (!response.ok) {
        throw new Error(`Error uploading file to iLovePDF: ${response.statusText}`);
    }

    const data = await response.json() as { server_filename: string };
    return data.server_filename;
}  

export async function splitPdf(token: string, server: string, task_id: string, server_filename: string, pages: number, original_filename: string): Promise<string> {
    // console.log(pages.join(','));

    const payload = {
        task: task_id,
        tool: 'split',
        files: [
            { server_filename: server_filename, filename:  original_filename }
        ],
        split_mode: 'ranges',
        ranges: pages,
    };
    console.log(payload)
    const response = await fetch(`https://${server}/v1/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Error splitting PDF in iLovePDF: ${response.statusText}`);
    }

    const data = await response.json() as { server_filename: string };
    return data.server_filename;
}


export async function downloadPdf(token: string, server: string, task_id: string): Promise<any> {
    console.log('Download PDF function called');
    console.log(`https://${server}/v1/download/${task_id}`);
    
    const response = await fetch(`https://${server}/v1/download/${task_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },

    });

    if (!response.ok) {
        throw new Error(`Error downloading PDF from iLovePDF: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // const data = await response.json();
    // console.log('Download PDF response data:', data);
    return buffer;
}


