export declare class AlistClient {
    private readonly host;
    private readonly username;
    private readonly password;
    private readonly client;
    private initialized;
    private token;
    constructor(host: string, username: string, password: string);
    init(): Promise<void>;
    stream_upload(filePath: string, targetDir: string, overwrite?: boolean): Promise<any>;
    upload_dir(filePath: string, targetDir: string, overwrite?: boolean): Promise<any>;
    list_path(path: string, password?: string | undefined): Promise<any>;
    fetch_metadata(path: string, password?: string | undefined): Promise<any>;
    delete_file(filename: string[], target_dir: string): Promise<any>;
    create_dir(target_dir: string): Promise<any>;
    private getToken;
    private getUrl;
    private throwIfNotInitialized;
}
