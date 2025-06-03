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
const core = __importStar(require("@actions/core"));
const alist_client_1 = require("./alist_client");
const fs = __importStar(require("fs-extra"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let host = core.getInput('host') || process.env.ALIST_HOST || '';
        if (!host) {
            core.setFailed('Host is required. Please set the host input or ALIST_HOST environment variable.');
            return;
        }
        let username = core.getInput('username') || process.env.ALIST_USERNAME || '';
        if (!username) {
            core.setFailed('Username is required. Please set the username input or ALIST_USERNAME environment variable.');
            return;
        }
        let password = core.getInput('password') || process.env.ALIST_PASSWORD || '';
        if (!password) {
            core.setFailed('Password is required. Please set the password input or ALIST_PASSWORD environment variable.');
            return;
        }
        let file_path = core.getInput("file_path", { required: true });
        let target_dir = core.getInput("target_dir", { required: true });
        let overwrite = core.getInput("overwrite") === 'true';
        core.info("Starting Alist client with the following parameters:");
        core.info(`Host: ${host}`);
        core.info(`Username: ${username}`);
        const alistClient = new alist_client_1.AlistClient(host, username, password);
        yield alistClient.init();
        const stats = yield fs.stat(file_path);
        if (stats.isDirectory()) {
            core.info(`The provided file path is a directory: ${file_path}`);
            core.info(yield alistClient.upload_dir(file_path, target_dir, overwrite));
        }
        else if (stats.isFile()) {
            core.info(`The provided file path is a file: ${file_path}`);
            core.info(yield alistClient.stream_upload(file_path, target_dir, overwrite));
        }
        else {
            core.setFailed(`The provided file path is neither a file nor a directory: ${file_path}`);
            return;
        }
    });
}
// noinspection JSIgnoredPromiseFromCall
run();
