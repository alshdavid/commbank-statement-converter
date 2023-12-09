export function makeReactive(target: any, ...propertyKeys: string[]) {
  for (const propertyKey of propertyKeys) {
    let currentValue: any = target[propertyKey]

    Object.defineProperty(target, propertyKey, {
      set: (newValue: string) => {
        currentValue = newValue;
        target.forceUpdate()
      },
      get: () => currentValue,
    });
  }
};
