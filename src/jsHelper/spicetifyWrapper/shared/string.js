export const fnStr = (f) => {
  try {
    return f.toString();
  } catch {
    try {
      return Function.prototype.toString.call(f);
    } catch {
      return "";
    }
  }
};
