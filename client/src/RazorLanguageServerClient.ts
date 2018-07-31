/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/lib/main';
import { RazorLanguage } from './RazorLanguage';
import { RazorLanguageServerOptions } from './RazorLanguageServerOptions';
import { EventEmitter } from 'events';

export class RazorLanguageServerClient implements vscode.Disposable {
    private static Events = 
    {
        ServerStart: "ServerStart",
        ServerStop: "ServerStop"
    };

    private _clientOptions: LanguageClientOptions;
    private _serverOptions: ServerOptions;
    private _client: LanguageClient;
    private _startDisposable: vscode.Disposable | undefined;
    private _eventBus: EventEmitter;

    constructor(options: RazorLanguageServerOptions) {
        this._clientOptions = {
            documentSelector: <any>RazorLanguage.documentSelector, // No idea why I need to cast here.
            outputChannel: options.outputChannel
        };

        // TODO: Resolve dotnet path or self-host server executable
        let args = [options.serverDllPath, '-lsp'];

        if (options.debug) {
            args[2] = "--debug";
        }

        this._serverOptions = {
            run: { command: 'dotnet', args: args },
            debug: { command: 'dotnet', args: args }
        };

        this._client = new LanguageClient('razorLanguageServer', 'Razor Language Server', this._serverOptions, this._clientOptions);
        this._eventBus = new EventEmitter();
    }

    public onStart(listener: () => any): vscode.Disposable {
        this._eventBus.addListener(RazorLanguageServerClient.Events.ServerStart, listener);

        let disposable = new vscode.Disposable(() => this._eventBus.removeListener(RazorLanguageServerClient.Events.ServerStart, listener));
        return disposable;
    }

    public onStop(listener: () => any): vscode.Disposable {
        this._eventBus.addListener(RazorLanguageServerClient.Events.ServerStop, listener);

        let disposable = new vscode.Disposable(() => this._eventBus.removeListener(RazorLanguageServerClient.Events.ServerStop, listener));
        return disposable;
    }

    public async start(): Promise<void> {
        this._startDisposable = await this._client.start();
        await this._client.onReady();

        this._eventBus.emit(RazorLanguageServerClient.Events.ServerStart);
    }

    public dispose(): void {
        if (this._startDisposable) {
            this._startDisposable.dispose();
        }

        this._eventBus.emit(RazorLanguageServerClient.Events.ServerStop);
    }
}