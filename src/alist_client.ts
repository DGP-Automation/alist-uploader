import * as http from '@actions/http-client'
import * as core from '@actions/core'
import * as fs from 'fs-extra'
import {Readable} from 'stream';

export class AlistClient {
    private readonly host: string;
    private readonly username: string;
    private readonly password: string;
    private readonly client: http.HttpClient;
    private initialized: boolean = false;
    private token: string | undefined;

    constructor(host: string, username: string, password: string) {
        this.host = host;
        this.username = username;
        this.password = password;
        this.client = new http.HttpClient('alist-client', undefined, {
            socketTimeout: 120 * 1000
        });
    }

    async init(): Promise<void> {
        core.info("Initializing Alist client...");
        this.token = await this.getToken();
        this.initialized = true;
        core.info("Alist client initialized successfully.");
    }

    async stream_upload(filePath: string, targetDir: string, overwrite: boolean = true): Promise<any> {
        this.throwIfNotInitialized();
        core.info(`Uploading ${filePath} to ${targetDir}`);
        const filename = filePath.split('/').pop() || '';
        const MIMEType = 'application/octet-stream';
        const remote_path = `${targetDir}/${filename}`;
        if (!overwrite) {
            const metadata = await this.fetch_metadata(remote_path);
            if (metadata && metadata.code === 200) {
                const local_file_size = await fs.stat(filePath).then(s => s.size);
                if (metadata.data.size === local_file_size) {
                    core.info(`File ${remote_path} already exists. Skipping upload.`);
                    return {"code": 204, "message": "File already exist, skip as user defined setting."}
                }
            }
        }
        const buf = await fs.readFile(filePath);
        const stream = Readable.from(buf);
        const encoded_path = encodeURI(remote_path);
        const headers = {
            "Authorization": this.token,
            "Content-Type": MIMEType,
            "Content-Length": buf.length.toString(),
            "File-Path": encoded_path,
            "As-Task": "true"
        }
        // @ts-ignore
        const res = await this.client.put(this.getUrl("/api/fs/put"), stream, headers);
        if (res.message.statusCode === 200) {
            core.info(`File ${remote_path} uploaded successfully.`);
            return await res.readBody().then(body => JSON.parse(body));
        } else {
            const error = await res.readBody();
            core.error(`Failed to upload file: ${error}`);
            throw new Error(`Upload failed with status code ${res.message.statusCode}: ${error}`);
        }
    }

    async upload_dir(filePath: string, targetDir: string, overwrite: boolean = true): Promise<any> {
        this.throwIfNotInitialized();
        core.info(`Uploading directory ${filePath} to ${targetDir}`);
        const dirName = filePath.split('/').pop() || '';
        await this.create_dir(`${targetDir}/${dirName}`);
        const tempTargetDir = `${targetDir}/${dirName}`;
        const files = await fs.readdir(filePath);
        for (const file of files) {
            const fullPath = `${filePath}/${file}`;
            const fileStats = await fs.stat(fullPath);
            if (fileStats.isFile()) {
                core.info(`Uploading file: ${fullPath} to ${tempTargetDir}`);
                await this.stream_upload(fullPath, tempTargetDir, overwrite);
            } else if (fileStats.isDirectory()) {
                core.info(`Found subdirectory: ${fullPath}. Recursively uploading...`);
                await this.upload_dir(fullPath, tempTargetDir, overwrite);
            } else {
                core.warning(`Skipping non-file item: ${fullPath}`);
            }
        }
        return {"code": 200, "message": "Directory uploaded successfully."};
    }

    async list_path(path: string, password: string | undefined = undefined): Promise<any> {
        this.throwIfNotInitialized();
        core.info(`Listing path: ${path}`);
        const headers = {
            "Authorization": this.token,
            "Content-Type": "application/json"
        }
        const body = {
            "path": path
        }
        if (password) {
            // @ts-ignore
            body["password"] = password;
        }
        return await this.client.post(this.getUrl("/api/fs/dirs"), JSON.stringify(body), headers)
            .then(res => res.readBody())
            .then(res => JSON.parse(res));
    }

    async fetch_metadata(path: string, password: string | undefined = undefined): Promise<any> {
        this.throwIfNotInitialized();
        core.info(`Fetching metadata for path: ${path}`);
        const headers = {
            "Authorization": this.token,
            "Content-Type": "application/json"
        }
        const body = {
            "path": path
        }
        if (password) {
            // @ts-ignore
            body["password"] = password;
        }
        return await this.client.post(this.getUrl("/api/fs/get"), JSON.stringify(body), headers)
            .then(res => res.readBody())
            .then(res => JSON.parse(res));
    }

    async delete_file(filename: string[], target_dir: string): Promise<any> {
        this.throwIfNotInitialized();
        core.info(`Deleting file(s): ${filename} from ${target_dir}`);
        const headers = {
            "Authorization": this.token,
            "Content-Type": "application/json"
        }
        const body = {
            "name": filename,
            "dir": target_dir
        }
        return await this.client.post(this.getUrl("/api/fs/remove"), JSON.stringify(body), headers)
            .then(res => res.readBody())
            .then(res => JSON.parse(res));
    }

    async create_dir(target_dir: string): Promise<any> {
        this.throwIfNotInitialized();
        core.info(`Creating directory: ${target_dir}`);
        const headers = {
            "Authorization": this.token,
            "Content-Type": "application/json"
        }
        const body = {
            "path": target_dir
        }
        return await this.client.post(this.getUrl("/api/fs/mkdir"), JSON.stringify(body), headers)
            .then(res => res.readBody())
            .then(res => JSON.parse(res));
    }

    private async getToken(): Promise<string> {
        const headers = {
            "Content-Type": "application/json"
        }
        const body = {
            "username": this.username,
            "password": this.password
        }
        const res = await this.client.post(this.getUrl("/api/auth/login"), JSON.stringify(body), headers)
            .then(res => res.readBody())
            .then(res => JSON.parse(res));

        if (res.code === 200) {
            return res.data.token;
        } else {
            throw new Error(`Failed to get token: ${res.message}`);
        }
    }

    private getUrl(path: string): string {
        return `https://${this.host}${path}`;
    }

    private throwIfNotInitialized(): void {
        if (!this.initialized) {
            throw new Error("Alist client is not initialized. Please call init() before using other methods.");
        }
    }
}