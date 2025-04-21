import {SecretFile} from "./secretfile";

export class Secret {
    id: string = "";
    message: string = "";
    expires_at: string = "";
    password: string = "";

    files?: SecretFile[] = [];
}
