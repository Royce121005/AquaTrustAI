"""Generate a standard Postman Collection v2.1 JSON file from OpenAPI spec."""

import json
import urllib.request

def generate_postman_collection():
    with open("AquaTrustAI_OpenAPI_Spec.json", "r", encoding="utf-8") as f:
        spec = json.load(f)

    collection = {
        "info": {
            "name": "AquaTrust AI — API Collection (v2.1)",
            "description": "AquaTrust AI API collection with preconfigured endpoints, auth, and payloads.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    }

    folders = {}

    for path, methods in spec.get("paths", {}).items():
        parts = path.strip("/").split("/")
        # group by section (e.g. auth, facilities, readings)
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
            folder_name = parts[2]
        elif len(parts) >= 1:
            folder_name = parts[0]
        else:
            folder_name = "general"

        if folder_name not in folders:
            folders[folder_name] = {
                "name": folder_name.upper(),
                "item": []
            }

        for method, details in methods.items():
            if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                continue

            summary = details.get("summary") or f"{method.upper()} {path}"
            
            # Request item
            req_item = {
                "name": f"[{method.upper()}] {summary}",
                "request": {
                    "method": method.upper(),
                    "header": [
                        {"key": "Accept", "value": "application/json"}
                    ],
                    "url": {
                        "raw": f"http://127.0.0.1:8000{path}",
                        "protocol": "http",
                        "host": ["127", "0", "0", "1"],
                        "port": "8000",
                        "path": [p for p in path.strip("/").split("/")]
                    },
                    "description": details.get("description", "")
                }
            }

            # Add body for POST
            if method.lower() == "post":
                req_item["request"]["header"].append({"key": "Content-Type", "value": "application/json"})
                if "login" in path:
                    req_item["request"]["body"] = {
                        "mode": "raw",
                        "raw": json.dumps({"username": "operator", "password": "operator123"}, indent=2)
                    }
                else:
                    req_item["request"]["body"] = {
                        "mode": "raw",
                        "raw": "{}"
                    }

            folders[folder_name]["item"].append(req_item)

    for f_name, f_data in sorted(folders.items()):
        collection["item"].append(f_data)

    with open("AquaTrustAI_Postman_v2_1.json", "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2)

    print(f"Generated AquaTrustAI_Postman_v2_1.json with {len(folders)} folders and {sum(len(f['item']) for f in folders.values())} requests.")

if __name__ == "__main__":
    generate_postman_collection()
