/**
 * Simple WGSL preprocessor supporting #include "module" directives
 * and #define KEY VALUE substitutions.
 */

type ShaderModuleMap = Record<string, string>

export function preprocessWGSL(
  source: string,
  modules: ShaderModuleMap = {},
  defines: Record<string, string> = {},
): string {
  let result = source

  // Process #define substitutions
  for (const [key, value] of Object.entries(defines)) {
    result = result.replaceAll(`\${${key}}`, value)
  }

  // Process #include directives
  const includeRegex = /^#include\s+"(\w+)"\s*$/gm
  result = result.replace(includeRegex, (_match, moduleName: string) => {
    const mod = modules[moduleName]
    if (!mod) {
      console.warn(`[WGSL Preprocessor] Unknown module: "${moduleName}"`)
      return `// ERROR: module "${moduleName}" not found`
    }
    return mod
  })

  return result
}
