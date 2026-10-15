// Grava no Supabase (modo ao vivo) ou nos dados de demonstração (sem banco).
import { rebuildIndexes } from './metrics'
import { supabase } from './supabase'

type Linha = Record<string, unknown>

export async function inserir(tabela: string, linha: Linha, demo: () => void): Promise<string | void> {
  if (supabase) {
    const { error } = await supabase.from(tabela).insert(linha)
    if (error) return traduzir(error.message)
    return
  }
  demo()
  rebuildIndexes()
}

export async function alterar(tabela: string, id: string, campos: Linha, demo: () => void): Promise<string | void> {
  if (supabase) {
    const { error } = await supabase.from(tabela).update(campos).eq('id', id)
    if (error) return traduzir(error.message)
    return
  }
  demo()
  rebuildIndexes()
}

function traduzir(msg: string) {
  if (/row-level security/i.test(msg)) return 'Sem permissão para gravar. Confira se o seu usuário está na tabela admins (passo 2 do guia).'
  if (/duplicate key/i.test(msg)) return 'Já existe um registro com esse código.'
  return msg
}

export async function excluir(tabela: string, id: string, demo: () => void): Promise<string | void> {
  if (supabase) {
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) return traduzir(error.message)
    return
  }
  demo()
  rebuildIndexes()
}

/** Remove um item de um array dos dados de demonstração. */
export function tirar<T>(arr: T[], item: T) {
  const i = arr.indexOf(item)
  if (i >= 0) arr.splice(i, 1)
}
