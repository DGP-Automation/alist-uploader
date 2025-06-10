import * as core from '@actions/core';
import {AlistClient} from './alist_client';
import * as fs from 'fs-extra';

async function run() {
    try {
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
        let file_path = core.getInput("file_path", {required: true});
        let target_dir = core.getInput("target_dir", {required: true});
        let overwrite = core.getInput("overwrite") === "true";

        core.info("Starting Alist client with the following parameters:");
        core.info(`Host: ${host}`);
        core.info(`Username: ${username}`);

        const alistClient = new AlistClient(host, username, password);
        await alistClient.init();

        const stats = await fs.stat(file_path);
        if (stats.isDirectory()) {
            core.info(`The provided file path is a directory: ${file_path}`);
            core.info(await alistClient.upload_dir(file_path, target_dir, overwrite).then(JSON.stringify));
        } else if (stats.isFile()) {
            core.info(`The provided file path is a file: ${file_path}`);
            core.info(await alistClient.stream_upload(file_path, target_dir, overwrite).then(JSON.stringify));
        } else {
            core.setFailed(`The provided file path is neither a file nor a directory: ${file_path}`);
            return;
        }
    } catch (error) {
        // @ts-ignore
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

// noinspection JSIgnoredPromiseFromCall
run()