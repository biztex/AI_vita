export async function recordUpload(testType: string, fileKey: string) {
    return { testType, fileKey, status: "RECEIVED" };
  }
  