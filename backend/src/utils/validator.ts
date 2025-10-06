export function required(value: any, name: string) {
    if (!value) throw new Error(`Missing field: ${name}`);
  }
  