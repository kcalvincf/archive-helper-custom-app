import type { PlainClientAPI } from "contentful-management";
import contentfulManagement from "contentful-management";

export function createPlainCmaClient(accessToken: string): PlainClientAPI {
  return contentfulManagement.createClient({ accessToken }, { type: "plain" });
}
