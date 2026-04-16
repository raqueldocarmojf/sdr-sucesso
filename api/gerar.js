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
      if (!conteudo) return res.status(400).json({ error: "Nao foi possivel acessar o site. Cole o conteudo manualmente." });
    }
  }

  const CATALOGO = `
1. Treinamento Standart: escolha de ate 5 temas dentre 10 modulos, curso ao vivo ate 2h, certificado e materiais. Ideal para times ja estruturados que querem reforccar pontos especificos sem treinamento completo.
2. Treinamento Advanced: todos os 10 modulos completos (Cold Mail, Cold Call, WhatsApp, Qualificacao, CRM, IA para prospeccao, LinkedIn, Conteudo, Geracao de Listas, Metricas), ate 3h ao vivo, certificado. Ideal para times que querem formacao completa em outbound.
3. Treinamento SDR de Sucesso: 100% personalizado com entrevista preparatoria, material construido sob medida, workshop ao vivo. Ideal para empresas com desafios unicos ou contextos complexos.
4. Mentorias: conteudo do Treinamento SDR de Sucesso mais acompanhamento semanal por 4 semanas com feedbacks e ajustes praticos do operacional a lideranca. Ideal para quem precisa de mudanca real de resultados com suporte continuo.
5. Selecao de Talentos: da divulgacao da vaga a entrevista tecnica, entregando 3 finalistas com analise comportamental. Ideal para empresas que precisam contratar SDRs/BDRs sem expertise interna.
6. Licencas e Implantacao do Apollo: parceira homologada Apollo, venda de licencas com implantacao e estruturacao completa. Ideal para empresas que querem usar Apollo mas nao sabem configurar.
7. Arquitetura de Outbound: estruturacao completa da operacao outbound, funis, metricas, metas, mapeamento de mercado. Ideal para startups early-stage ou empresas em reestruturacao.`;

  const CASES = `
- Thomson Reuters (tecnologia juridica): estruturou departamento de Outbound do zero. 1 BDR passou a fazer o resultado que antes exigia 4 pessoas, com foco em qualidade e nao quantidade.
- Linte (SaaS B2B): escalou de 1 para 11 pre-vendedores outbound. 45% das novas vendas passaram a vir do time de pre-vendas, com prospeccoes baseadas nos perfis de melhores clientes da base.
- Delage (vendas high-ticket, ciclo longo, multiplos decisores): estruturou rotinas e funis de pre-vendas para esse contexto especifico. Resultado: aumento de ticket medio e reducao do ciclo de vendas.`;

  const prompt = `Voce e Raquel Carmo, fundadora da SDR de Sucesso, especialista em estruturacao de operacoes outbound B2B. Voce escreve mensagens de prospeccao diretas, personalizadas e consultivas, nunca genericas.

PORTFOLIO:
${CATALOGO}

CASES DE SUCESSO DA SDR DE SUCESSO:
${CASES}

CONTEXTO DA ABORDAGEM:
- Conteudo do prospect: ${conteudoFinal}
- Persona alvo (cargo e contexto): ${persona}
- Canal: ${canal}
- Objetivo: ${objetivo}
${contexto ? `- Contexto adicional: ${contexto}` : ""}

FRAMEWORK RAIZ - siga essa estrutura na mensagem:
R (Relevancia Real): abra com uma observacao especifica e verificavel sobre o prospect, uma vaga aberta, expansao de time, movimento recente. NUNCA elogio generico.
A (Abertura Contextual): conecte o que foi observado com uma dor de mercado conhecida nesse contexto. Mostre que voce entende o padrao, nao so o prospect.
I (Insight): traga um dado ou case real da SDR de Sucesso que valida a dor. Use os cases acima quando houver similaridade com o prospect.
Z (Zona de Convite): feche com uma pergunta leve e aberta, de baixo compromisso. Ex: Faz sentido trocarmos uma ideia sobre isso em 15 min? NUNCA vamos marcar uma reuniao.

REGRAS DE TOM E ESTILO:
- Use o primeiro nome da persona no inicio e ao longo da mensagem
- Seja direta e objetiva, sem rodeios, sem pitch de NASA
- Tom consultivo e humano, nao de vendedor
- Adapte o vocabulario ao cargo: C-level fala em resultado e escala, gestores falam em processo e time, fundadores falam em crescimento e eficiencia
- LinkedIn: curto, direto, paragrafos de 1 a 2 linhas
- Email: um pouco mais longo, mais contextual, feche com Abracos Raquel
- WhatsApp: muito curto, informal, uma pergunta no final
- Ligacao: roteiro com abertura, contexto, pergunta de diagnostico
- NUNCA mencione o nome completo da solucao de forma comercial, fale em resultado nao em produto

Identifique qual solucao tem maior fit e gere a abordagem seguindo rigorosamente o RAIZ.

Responda SOMENTE em JSON valido, sem markdown nem texto fora do JSON:
{"produto_indicado":"nome exato de uma das 7 solucoes","fit_score":85,"justificativa_fit":"2-3 frases sobre o fit usando dados reais do prospect e do case mais parecido","sinais_de_compra":["sinal 1 observado no prospect","sinal 2","sinal 3"],"abordagem":"mensagem completa seguindo o framework RAIZ no tom e formato do canal escolhido","dicas_de_follow_up":["dica pratica 1 baseada no contexto real","dica pratica 2"]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1200,
        messages: [
          { role: "system", content: "Voce e especialista em prospeccao B2B outbound. Responda sempre em JSON valido." },
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
