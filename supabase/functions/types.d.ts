// Declarações de tipo para Supabase Edge Functions (runtime Deno)
// Esses tipos existem apenas para suprimir erros no VS Code.
// No deploy, o Supabase Edge Runtime fornece esses globais automaticamente.

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  const env: {
    get(key: string): string | undefined;
  };
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string, options?: any): any;
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}
