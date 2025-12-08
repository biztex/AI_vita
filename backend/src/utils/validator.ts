export function required(value: any, name: string) {
    if (!value) throw new Error(`必須フィールドが不足しています: ${name}`);
  }
  