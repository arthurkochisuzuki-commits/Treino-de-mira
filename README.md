# 🎯 Treino de Mira - Valorant Aim Lab Pro

Um simulador e analisador de treino de mira 3D desenvolvido especificamente com a **física e sensibilidade autêntica do VALORANT**.

---

## 🚀 Como Jogar

Não é necessário instalar nenhum programa ou dependência! O jogo roda diretamente no seu navegador de internet (Google Chrome, Microsoft Edge, Opera, Brave, Firefox, etc.).

1. Abra a pasta do projeto.
2. Dê um **duplo clique no arquivo `index.html`**.
3. O jogo abrirá imediatamente no seu navegador padrão em modo 3D imersivo.

---

## ⚡ Funcionalidades Principais

### 1. Iniciar Análise com Tempo Personalizável
- **Durações Pré-definidas:**
  - `15s` (Aquecimento Rápido)
  - `30s` (Padrão Competitivo)
  - `60s` (Treino Completo)
  - `90s` (Resistência Muscular)
  - `Outro` (Defina qualquer quantidade de segundos livremente)
- **Modos de Treino (The Range 3D):**
  - **Gridshot (Flick):** 3 alvos simultâneos na arena 3D. Elimine um e outro surge instantaneamente. Foco em velocidade de reflexo e micro-ajuste.
  - **Micro-Adjust (Spidershot):** 1 alvo por vez com tempo limitado. Treina precisão cirúrgica de primeiro tiro (*One-Tap*).
  - **Rastreio (Tracking):** Alvos 3D em movimento suave contínuo para treinar acompanhamento de mira e controle de recuo.

### 2. Histórico de Sessões com Recordes & Gráfico de Evolução
No botão **HISTÓRICO**, você tem acesso a uma central estatística completa:
- **👑 Melhor Recorde (High Score):**
  - Destaque da sua pontuação máxima histórica.
  - Taxa de acerto e patente alcançada na sua melhor sessão.
- **📊 Média Geral das Sessões:**
  - Média de pontuação acumulada.
  - Média da taxa de acerto (%) e tempo de reação (ms).
- **📈 Gráfico de Evolução Interativo (Canvas):**
  - Curva de progresso cronológica (sessão a sessão).
  - **Linha tracejada de referência com a sua Média Geral**.
  - **Destaque dourado com estrela no ponto do Melhor Recorde** (`★ RECORDE`).
  - Alternador entre **Pontuação** e **Taxa de Acerto (%)**.
- **Registro Detalhado das Sessões:** Lista completa com data, horário, alvos acertados, tempo de reação e patente.

### 3. Relatório Completo de Desempenho e Taxa de Acerto
Assim que o cronômetro chega a zero, a análise exibe:
- **Taxa de Acerto (%)**: Percentual exato de tiros que atingiram os alvos.
- **Patente Estimada do Valorant**: Classificação do seu rendimento do **Ferro ao Radiante**, avaliando precisão e agilidade.
- **Métricas Detalhadas**:
  - Alvos acertados
  - Tiros errados (*Whiffs*)
  - Total de disparos efetuados
  - **Tempo médio de reação em milissegundos (ms)**
  - Tiros por segundo (DPS)
  - Maior sequência de acertos (*Streak*)
  - Pontuação final
- **Dicas do Treinador**: Recomendações automáticas com base nos seus erros e acertos para subir de elo no Valorant.

### 4. Área de Configurações de Sensibilidade (Baseada no Valorant)
- **Fórmula Idêntica ao Valorant**: Utiliza a taxa de rotação padrão do motor do Valorant (`m_yaw = 0.07` graus por contagem do mouse) e campo de visão horizontal de 103°.
- **Ajuste Numérico & Slider**: Digite exatamente a sensibilidade que você usa no Valorant (ex: `0.35`, `0.40`, `0.52`).
- **Seletor de DPI & Cálculo de eDPI**:
  - `eDPI = Sensibilidade × DPI`
  - Feedback em tempo real informando se o seu eDPI está na faixa dos jogadores profissionais (média pro: 200 a 350 eDPI).
- **Inverter Eixo Y**: Opção para quem prefere mira vertical invertida.
- **Conversor de Sensibilidade de Outros Jogos**:
  - Converta sua sensibilidade de **Counter-Strike 2 (CS:GO)**, **Apex Legends**, **Overwatch 2**, **Fortnite** ou **Rainbow Six Siege** diretamente para o Valorant com 1 clique.

### 5. Customização Completa de Mira (Crosshair)
- **Cores**: Ciano, Verde, Branco, Vermelho, Amarelo, Rosa ou personalizada.
- **Parâmetros**:
  - Comprimento das linhas (*Length*)
  - Espessura das linhas (*Thickness*)
  - Abertura central (*Gap / Offset*)
  - Ponto central (*Center Dot*)
  - Contorno preto (*Outline*)
- **Pré-visualização em tempo real** dentro do menu de configurações.

### 6. Áudio & Efeitos Visuais
- Sintetizador de áudio de ultra-baixa latência via **Web Audio API** (som de disparo realista, ding metálico de *headshot*, contagem regressiva e efeitos sonoros).
- *Hitmarker* vermelho animado e explosão de partículas tridimensionais no momento do impacto.

---

## 🎮 Controles no Jogo

- **Botão Esquerdo do Mouse:** Atirar
- **Movimentação do Mouse:** Controlar mira (rotação 3D com sensibilidade 1:1 Valorant)
- **Tecla `ESC`:** Pausar / Desbloquear mouse
