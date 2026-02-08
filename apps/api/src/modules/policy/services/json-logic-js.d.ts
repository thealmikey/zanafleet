declare module 'json-logic-js' {
  export interface JsonLogic {
    apply(logic: object, data?: object): unknown;
    add_operation(name: string, code: (...args: unknown[]) => unknown): void;
    rm_operation(name: string): void;
    is_logic(logic: unknown): boolean;
    truthy(value: unknown): boolean;
    get_operator(logic: object): string | null;
    get_values(logic: object): unknown[];
    uses_data(logic: object): string[];
  }

  const jsonLogic: JsonLogic;
  export default jsonLogic;
}
