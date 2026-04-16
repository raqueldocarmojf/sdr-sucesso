export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { conteudo, persona, canal, objetivo, tipo, contexto } = req.body;

  if (!conteudo || !persona) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  const CATALOGO = `
1. Treinamento Standart: escolha de até 5 temas dentre 10 módulos, curso ao vivo até 2h, certificado e materiais. Ideal para times já estruturados que querem reforçar pontos específicos sem treinamento completo.
2. Treinamento Advanced: todos os 10 módulos completos (Cold Mail, Cold Call, WhatsApp, Qualificação, CRM, IA para prospecção, LinkedIn, Conteúdo, Geração de Listas, Métricas), até 3h ao vivo, certificado. Ideal para times que querem formação completa em outbound.
3. Treinamento SDR de Sucesso: 100% personalizado com entrevista preparatória, material construído sob medida, workshop ao vivo. Ideal para empresas com desafios únicos ou contextos complexos.
4. Mentorias: conteúdo do Treinamento SDR de Sucesso + acompanhamento semanal por 4 semanas com feedbacks e ajustes práticos do operacional à liderança. Ideal para quem precisa de mudança real de resultados com suporte contínuo.
5. Seleção de Talentos: da divulgação da vaga à entrevista técnica, entregando 3 finalistas com análise comportamental. Ideal para empresas que precisam contratar SDRs/BDRs sem expertise interna para avaliação técnica.
6. Licenças e Implantação do Apollo: parceira homologada Apollo, venda de licenças com implantação e estruturação completa. Ideal para empresas que querem usar Apollo mas não sabem configurar.
7. Arquitetura de Outbound: estruturação completa da operação outbound — funis, métricas, metas, mapeamento de mercado. Ideal para startups early-stage ou empresas em reestruturação sem processo outbound consistente.`;

  const EMAILS_AUTORIZADOS = (process.env.EMAILS_AUTORIZADOS || "").split(",").map(e => e.trim().toLowerCase());

  const emailUsuario = (req.body.email || "").trim().toLowerCase();

  if (!emailUsuario) {
    return res.status(401).json({ error: "Email obrigatório para acessar a ferramenta." });
  }

  if (EMAILS_AUTORIZADOS.length > 0 && !EMAILS_AUTORIZADOS.includes(emailUsuario)) {
    return res.status(403).json({ error: "Acesso não autorizado. Entre em contato com raquel@sdrdesucesso.com para liberar seu acesso." });
  }

  const prompt = `Você é especialista em prospecção B2B outbound representando Raquel Carmo, fundadora da SDR de Sucesso.

PORTFÓLIO:
${CATALOGO}

CONTEXTO:
- Tipo: ${tipo}
- Conteúdo da vaga/empresa: ${conteudo}
- Persona: ${persona}
- Canal: ${canal}
- Objetivo: ${objetivo}
${contexto ? `- Contexto adicional: ${contexto}` : ""}

Identifique qual solução tem maior fit e gere abordagem de alta conversão.

Responda SOMENTE em JSON válido, sem markdown nem texto fora do JSON:
{"produto_indicado":"nome exato de uma das 7 soluções","fit_score":85,"justificativa_fit":"2-3 frases sobre o fit","sinais_de_compra":["sinal 1","sinal 2","sinal 3"],"abordagem":"mensagem completa pronta para enviar, personalizada, assinada como Raquel / SDR de Sucesso","dicas_de_follow_up":["dica 1","dica 2"]}`;

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
          { role: "system", content: "Você é um especialista em prospecção B2B outbound. Responda sempre em JSON válido conforme solicitado." },
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
    const text = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
