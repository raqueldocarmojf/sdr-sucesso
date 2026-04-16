export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { url, conteudo, persona, canal, objetivo, contexto, email } = req.body;

  if (!persona) return res.status(400).json({ error: "Persona é obrigatória." });
  if (!url && !conteudo) return res.status(400).json({ error: "Informe o link do site ou cole o conteúdo manualmente." });

  const EMAILS_AUTORIZADOS = (process.env.EMAILS_AUTORIZADOS || "").split(",").map(e => e.trim().toLowerCase());
  const emailUsuario = (email || "").trim().toLowerCase();

  if (!emailUsuario) return res.status(401).json({ error: "E-mail obrigatório para acessar a ferramenta." });
  if (EMAILS_AUTORIZADOS.length > 0 && !EMAILS_AUTORIZADOS.includes(emailUsuario)) {
    return res.status(403).json({ error: "Acesso não autorizado. Entre em contato com raquel@sdrdesucesso.com para liberar seu acesso." });
  }

  let conteudoFinal = conteudo || "";

  if (url && url.startsWith("http")) {
    try {
      const siteRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
        signal: AbortSignal.timeout(8000)
      });
      const html = await siteRes.text();
      const semTags = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 6000);
      conteudoFinal = semTags + (conteudo ? "\n\nContexto adicional:\n" + conteudo : "");
    } catch (e) {
      if (!conteudo) return res.status(400).json({ error: "Não foi possível acessar o site. Cole o conteúdo manualmente." });
    }
  }

  const CATALOGO = `
1. Treinamento Standart: escolha de até 5 temas dentre 10 módulos, curso ao vivo até 2h, certificado e materiais. Ideal para times já estruturados que querem reforçar pontos específicos sem treinamento completo.
2. Treinamento Advanced: todos os 10 módulos completos (Cold Mail, Cold Call, WhatsApp, Qualificação, CRM, IA para prospecção, LinkedIn, Conteúdo, Geração de Listas, Métricas), até 3h ao vivo, certificado. Ideal para times que querem formação completa em outbound.
3. Treinamento SDR de Sucesso: 100% personalizado com entrevista preparatória, material construído sob medida, workshop ao vivo. Ideal para empresas com desafios únicos ou contextos complexos.
4. Mentorias: conteúdo do Treinamento SDR de Sucesso + acompanhamento semanal por 4 semanas com feedbacks e ajustes práticos. Ideal para quem precisa de mudança real de resultados com suporte contínuo.
5. Seleção de Talentos: da divulgação da vaga à entrevista técnica, entregando 3 finalistas com análise comportamental. Ideal para empresas que precisam contratar SDRs/BDRs sem expertise interna.
6. Licenças e Implantação do Apollo: parceira homologada Apollo, venda de licenças com implantação e estruturação completa. Ideal para empresas que querem usar Apollo mas não sabem configurar.
7. Arquitetura de Outbound: estruturação completa da operação outbound — funis, métricas, metas, mapeamento de mercado. Ideal para startups early-stage ou empresas em reestruturação.`;

  const prompt = `Você é especialista em prospecção B2B outbound representando Raquel Carmo, fundadora da SDR de Sucesso.

PORTFÓLIO:
${CATALOGO}

CONTEXTO:
- Conteúdo do prospect: ${conteudoFinal}
- Persona: ${persona}
- Canal: ${canal}
- Objetivo: ${objetivo}
${contexto ? `- Contexto adicional: ${contexto}` : ""}

Identifique qual solução tem maior fit e gere abordagem de alta conversão usando informações reais do prospect. Assine como Raquel / SDR de Sucesso.

Responda SOMENTE em JSON válido:
{"produto_indicado":"nome exato de uma das 7 soluções","fit_score":85,"justificativa_fit":"2-3 frases com dados reais do prospect","sinais_de_compra":["sinal 1","sinal 2","sinal 3"],"abordagem":"mensagem completa personalizada com detalhes reais do prospect","dicas_de_follow_up":["dica 1","dica 2"]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [
          { role: "system", content: "Especialista em prospecção B2B outbound. Responda sempre em JSON válido." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err?.error?.message || "Erro na API" });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
