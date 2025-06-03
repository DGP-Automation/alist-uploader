"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlistClient = void 0;
const http = __importStar(require("@actions/http-client"));
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs-extra"));
class AlistClient {
    constructor(host, username, password) {
        this.initialized = false;
        this.host = host;
        this.username = username;
        this.password = password;
        this.client = new http.HttpClient('alist-client', undefined, {
            socketTimeout: 120 * 1000
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            core.info("Initializing Alist client...");
            this.token = yield this.getToken();
            this.initialized = true;
            core.info("Alist client initialized successfully.");
        });
    }
    stream_upload(filePath_1, targetDir_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, targetDir, overwrite = true) {
            this.throwIfNotInitialized();
            core.info(`Uploading ${filePath} to ${targetDir}`);
            const filename = filePath.split('/').pop() || '';
            const MIMEType = 'application/octet-stream';
            const remote_path = `${targetDir}/${filename}`;
            if (!overwrite) {
                const metadata = yield this.fetch_metadata(remote_path);
                if (metadata && metadata.code === 200) {
                    const local_file_size = yield fs.stat(filePath).then(s => s.size);
                    if (metadata.data.size === local_file_size) {
                        core.info(`File ${remote_path} already exists. Skipping upload.`);
                        return { "code": 204, "message": "File already exist, skip as user defined setting." };
                    }
                }
            }
            const buf = yield fs.readFile(filePath);
            const encoded_path = encodeURI(remote_path);
            const headers = {
                "Authorization": this.token,
                "Content-Type": MIMEType,
                "Content-Length": buf.length.toString(),
                "File-Path": encoded_path,
                "As-Task": "false"
            };
            const res = yield this.client.put(this.getUrl("/api/fs/put"), buf.toString("binary"), headers);
            if (res.message.statusCode === 200) {
                core.info(`File ${remote_path} uploaded successfully.`);
                return yield res.readBody().then(body => JSON.parse(body));
            }
            else {
                const error = yield res.readBody();
                core.error(`Failed to upload file: ${error}`);
                throw new Error(`Upload failed with status code ${res.message.statusCode}: ${error}`);
            }
        });
    }
    upload_dir(filePath_1, targetDir_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, targetDir, overwrite = true) {
            this.throwIfNotInitialized();
            core.info(`Uploading directory ${filePath} to ${targetDir}`);
            const dirName = filePath.split('/').pop() || '';
            yield this.create_dir(`${targetDir}/${dirName}`);
            const tempTargetDir = `${targetDir}/${dirName}`;
            const files = yield fs.readdir(filePath);
            for (const file of files) {
                const fullPath = `${filePath}/${file}`;
                const fileStats = yield fs.stat(fullPath);
                if (fileStats.isFile()) {
                    core.info(`Uploading file: ${fullPath} to ${tempTargetDir}`);
                    yield this.stream_upload(fullPath, tempTargetDir, overwrite);
                }
                else if (fileStats.isDirectory()) {
                    core.info(`Found subdirectory: ${fullPath}. Recursively uploading...`);
                    yield this.upload_dir(fullPath, tempTargetDir, overwrite);
                }
                else {
                    core.warning(`Skipping non-file item: ${fullPath}`);
                }
            }
            return { "code": 200, "message": "Directory uploaded successfully." };
        });
    }
    list_path(path_1) {
        return __awaiter(this, arguments, void 0, function* (path, password = undefined) {
            this.throwIfNotInitialized();
            core.info(`Listing path: ${path}`);
            const headers = {
                "Authorization": this.token,
                "Content-Type": "application/json"
            };
            const body = {
                "path": path
            };
            if (password) {
                // @ts-ignore
                body["password"] = password;
            }
            return yield this.client.post(this.getUrl("/api/fs/dirs"), JSON.stringify(body), headers)
                .then(res => res.readBody())
                .then(res => JSON.parse(res));
        });
    }
    fetch_metadata(path_1) {
        return __awaiter(this, arguments, void 0, function* (path, password = undefined) {
            this.throwIfNotInitialized();
            core.info(`Fetching metadata for path: ${path}`);
            const headers = {
                "Authorization": this.token,
                "Content-Type": "application/json"
            };
            const body = {
                "path": path
            };
            if (password) {
                // @ts-ignore
                body["password"] = password;
            }
            return yield this.client.post(this.getUrl("/api/fs/get"), JSON.stringify(body), headers)
                .then(res => res.readBody())
                .then(res => JSON.parse(res));
        });
    }
    delete_file(filename, target_dir) {
        return __awaiter(this, void 0, void 0, function* () {
            this.throwIfNotInitialized();
            core.info(`Deleting file(s): ${filename} from ${target_dir}`);
            const headers = {
                "Authorization": this.token,
                "Content-Type": "application/json"
            };
            const body = {
                "name": filename,
                "dir": target_dir
            };
            return yield this.client.post(this.getUrl("/api/fs/remove"), JSON.stringify(body), headers)
                .then(res => res.readBody())
                .then(res => JSON.parse(res));
        });
    }
    create_dir(target_dir) {
        return __awaiter(this, void 0, void 0, function* () {
            this.throwIfNotInitialized();
            core.info(`Creating directory: ${target_dir}`);
            const headers = {
                "Authorization": this.token,
                "Content-Type": "application/json"
            };
            const body = {
                "path": target_dir
            };
            return yield this.client.post(this.getUrl("/api/fs/mkdir"), JSON.stringify(body), headers)
                .then(res => res.readBody())
                .then(res => JSON.parse(res));
        });
    }
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.client.post(this.getUrl("/api/auth/login"), JSON.stringify({
                "username": this.username,
                "password": this.password
            }))
                .then(res => res.readBody())
                .then(res => JSON.parse(res));
            if (res.code === 200) {
                return res.data.token;
            }
            else {
                throw new Error(`Failed to get token: ${res.message}`);
            }
        });
    }
    getUrl(path) {
        return `https://${this.host}${path}`;
    }
    throwIfNotInitialized() {
        if (!this.initialized) {
            throw new Error("Alist client is not initialized. Please call init() before using other methods.");
        }
    }
}
exports.AlistClient = AlistClient;
