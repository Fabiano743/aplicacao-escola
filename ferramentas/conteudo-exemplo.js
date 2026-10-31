/* Conteúdo fictício para demonstrar o portal como se os professores já o usassem.
   Resumos por faixa de idade: 1º–2º, 3º–5º, 6º–7º e 8º–9º ano. */

/* Aulas por semana de cada disciplina (soma 25 = 5 aulas por dia) */
export const GRADE_INICIAIS = { "Língua Portuguesa": 6, "Matemática": 6, "Ciências": 3, "História": 3, "Geografia": 3, "Arte": 2, "Educação Física": 2 };
export const GRADE_FINAIS = { "Língua Portuguesa": 5, "Matemática": 5, "Ciências": 3, "História": 3, "Geografia": 3, "Arte": 2, "Educação Física": 2, "Língua Inglesa": 2 };

/* [disciplina, assunto, resumo, perguntas ("pergunta | resposta" por linha), desenho opcional] */
export const RESUMOS = {
  g1: [
    ["Língua Portuguesa", "Alfabeto e ordem alfabética", "O alfabeto tem 26 letras e elas seguem uma ordem: A, B, C, D...\nUsamos a ordem alfabética para organizar listas de nomes e para procurar palavras no dicionário.",
      "Quantas letras tem o alfabeto? | 26\nQual letra vem depois do M? | N\nEm ordem alfabética, o que vem primeiro: bola ou abelha? | Abelha"],
    ["Língua Portuguesa", "Vogais e consoantes", "As vogais são A, E, I, O e U. As outras letras são consoantes.\nToda sílaba tem pelo menos uma vogal: ca-sa, bo-la, pa-to.",
      "Quais são as vogais? | A, E, I, O e U\nA letra B é vogal ou consoante? | Consoante"],
    ["Matemática", "Números até 100", "Podemos contar de 1 em 1, de 2 em 2 e de 10 em 10.\nO número 35 tem 3 dezenas e 5 unidades.",
      "Quantas dezenas tem o número 47? | 4\nQual número vem depois do 59? | 60\nContando de 10 em 10: 10, 20, 30... qual é o próximo? | 40"],
    ["Matemática", "Adição e subtração", "Adicionar é juntar quantidades. Subtrair é tirar ou comparar.\nExemplos: 7 + 3 = 10 e 10 − 3 = 7.",
      "Quanto é 8 + 5? | 13\nQuanto é 12 − 4? | 8\nSe tenho 6 lápis e ganho 3, fico com quantos? | 9"],
    ["Ciências", "Higiene e saúde", "Lavar as mãos antes de comer e depois de usar o banheiro evita doenças.\nDevemos escovar os dentes depois de cada refeição.",
      "Quando devemos lavar as mãos? | Antes de comer e depois de usar o banheiro\nQuando devemos escovar os dentes? | Depois de cada refeição"],
    ["Ciências", "Seres vivos e elementos não vivos", "Seres vivos nascem, crescem, se alimentam e se reproduzem: pessoas, animais e plantas.\nPedras, água e ar não são seres vivos.",
      "Uma planta é um ser vivo? | Sim\nUma pedra é um ser vivo? | Não"],
    ["História", "A história da minha família", "Cada família tem a sua história. Fotos, documentos e conversas com os mais velhos ajudam a conhecer o passado.",
      "Cite uma forma de conhecer o passado da família. | Ver fotos, documentos ou conversar com os avós"],
    ["Geografia", "O caminho de casa até a escola", "Pontos de referência, como a padaria, a praça ou a igreja, ajudam a descrever um caminho.\nDesenhamos o caminho em um mapa simples.",
      "O que é um ponto de referência? | Um lugar conhecido que ajuda a encontrar o caminho"],
    ["Arte", "Cores primárias e secundárias", "As cores primárias são azul, vermelho e amarelo.\nMisturando duas delas, formamos as secundárias: verde, laranja e roxo.",
      "Azul misturado com amarelo forma qual cor? | Verde\nQuais são as cores primárias? | Azul, vermelho e amarelo", "cores"]
  ],
  g2: [
    ["Língua Portuguesa", "Substantivos próprios e comuns", "Substantivo é a palavra que dá nome a pessoas, animais, objetos, lugares e sentimentos.\nO próprio (Maria, Brasil) começa com letra maiúscula. O comum (menina, país) não.",
      "Brasil é substantivo próprio ou comum? | Próprio\nDê um exemplo de substantivo comum. | Cadeira, gato, cidade..."],
    ["Língua Portuguesa", "Sinais de pontuação", "O ponto final encerra a frase. O ponto de interrogação indica pergunta. O ponto de exclamação mostra surpresa ou emoção.\nA vírgula marca uma pequena pausa.",
      "Que sinal usamos no fim de uma pergunta? | Ponto de interrogação (?)\nQue sinal indica surpresa? | Ponto de exclamação (!)"],
    ["Matemática", "Multiplicação", "Multiplicar é somar parcelas iguais: 4 × 3 = 3 + 3 + 3 + 3 = 12.\nA ordem dos fatores não altera o resultado: 4 × 5 = 5 × 4.",
      "Quanto é 6 × 7? | 42\nQuanto é 8 × 9? | 72\n4 × 5 é igual a 5 × 4? | Sim, os dois dão 20"],
    ["Matemática", "Frações", "Fração representa partes de um inteiro. Em 3/4, o inteiro foi dividido em 4 partes iguais e pegamos 3.\nO número de cima é o numerador e o de baixo é o denominador.",
      "Em 2/5, qual é o denominador? | 5\nMetade de uma pizza é qual fração? | 1/2\nQual é maior: 1/2 ou 1/4? | 1/2"],
    ["Ciências", "Ciclo da água", "Com o calor do Sol, a água de rios e mares evapora. O vapor sobe, esfria e forma as nuvens (condensação).\nA água volta como chuva (precipitação) e infiltra no solo ou escorre para os rios.",
      "O que faz a água evaporar? | O calor do Sol\nComo se chama a chuva no ciclo da água? | Precipitação\nComo as nuvens se formam? | Pela condensação do vapor de água", "ciclo"],
    ["Ciências", "Cadeia alimentar", "Os produtores (plantas) fabricam o próprio alimento. Os consumidores se alimentam de outros seres.\nOs decompositores, como fungos e bactérias, transformam restos em nutrientes para o solo.",
      "Quem são os produtores? | As plantas\nCite um decompositor. | Fungos ou bactérias"],
    ["História", "Povos indígenas do Brasil", "Antes da chegada dos portugueses, o território já era habitado por muitos povos indígenas, com línguas e costumes diferentes.\nMuitas palavras do português vêm do tupi, como abacaxi, pipoca e mandioca.",
      "Cite uma palavra de origem tupi. | Abacaxi, pipoca ou mandioca"],
    ["Geografia", "Pontos cardeais", "Os pontos cardeais são Norte, Sul, Leste e Oeste.\nO Sol nasce do lado Leste e se põe do lado Oeste.",
      "De que lado o Sol nasce? | Leste\nQuais são os pontos cardeais? | Norte, Sul, Leste e Oeste"],
    ["Geografia", "Regiões do Brasil", "O Brasil é dividido em cinco regiões: Norte, Nordeste, Centro-Oeste, Sudeste e Sul.\nA maior região em área é a Norte.",
      "Quantas regiões tem o Brasil? | Cinco\nQual é a maior região em área? | Norte"],
    ["Arte", "Tarsila do Amaral", "Tarsila do Amaral foi uma pintora brasileira do Modernismo.\nSua obra mais conhecida é o Abaporu, de 1928.",
      "Qual é a obra mais conhecida de Tarsila do Amaral? | Abaporu"]
  ],
  g3: [
    ["Língua Portuguesa", "Adjetivos", "Adjetivo é a palavra que caracteriza o substantivo: casa grande, dia frio.\nEle concorda em gênero e número: menino alto, meninas altas.",
      "Em \"céu azul\", qual é o adjetivo? | Azul\nQual é a função do adjetivo? | Caracterizar o substantivo"],
    ["Língua Portuguesa", "Tipos de narrador", "O narrador-personagem conta a história em 1ª pessoa e participa dela.\nO narrador-observador conta em 3ª pessoa, sem participar dos acontecimentos.",
      "\"Eu cheguei atrasado à escola\": o narrador é de qual tipo? | Narrador-personagem (1ª pessoa)"],
    ["Matemática", "Frações equivalentes", "Frações equivalentes representam a mesma quantidade: 1/2 = 2/4 = 3/6.\nPara encontrar uma, multiplique ou divida o numerador e o denominador pelo mesmo número.",
      "1/2 é equivalente a quantos quartos? | 2/4\nSimplifique 6/9. | 2/3\n3/5 é equivalente a quantos décimos? | 6/10"],
    ["Matemática", "Números inteiros", "Os números inteiros incluem os negativos, o zero e os positivos.\nNa reta numérica, quanto mais à esquerda, menor o número: −5 é menor que −2.",
      "Qual é maior: −3 ou −7? | −3\nQuanto é −4 + 6? | 2\nQuanto é −2 − 5? | −7"],
    ["Ciências", "Camadas da Terra", "A Terra tem três camadas principais: a crosta, onde vivemos; o manto, formado por rocha derretida (magma); e o núcleo, a parte mais quente, de ferro e níquel.",
      "Em qual camada nós vivemos? | Crosta\nComo se chama a rocha derretida do manto? | Magma", "terra"],
    ["Ciências", "A célula", "A célula é a menor unidade viva. Tem membrana, citoplasma e núcleo, onde fica o material genético (DNA).\nA célula vegetal tem ainda parede celular e cloroplastos.",
      "Onde fica o DNA na célula? | No núcleo\nO que a célula vegetal tem a mais? | Parede celular e cloroplastos"],
    ["História", "Grécia Antiga", "Os gregos se organizavam em cidades-Estado, como Atenas e Esparta.\nAtenas criou a democracia, em que os cidadãos votavam nas decisões. Esparta era conhecida pela formação militar.",
      "Qual cidade grega criou a democracia? | Atenas\nEsparta era conhecida pelo quê? | Pela formação militar"],
    ["História", "Feudalismo", "Na Idade Média europeia, a terra era a principal riqueza.\nO senhor feudal cedia terras aos servos, que trabalhavam nelas e pagavam tributos.",
      "Qual era a principal riqueza no feudalismo? | A terra\nComo se chamava quem trabalhava na terra do senhor? | Servo"],
    ["Geografia", "Coordenadas geográficas", "A latitude mede a distância até a Linha do Equador (norte ou sul).\nA longitude mede a distância até o Meridiano de Greenwich (leste ou oeste).",
      "A latitude é medida a partir de qual linha? | Linha do Equador\nA longitude é medida a partir de qual meridiano? | Greenwich"],
    ["Língua Inglesa", "Simple present", "Usamos o simple present para hábitos e rotinas: I study every day.\nCom he, she e it, o verbo ganha -s: She plays soccer.",
      "Complete: He ___ (like) pizza. | likes\nTraduza: I study every day. | Eu estudo todos os dias."]
  ],
  g4: [
    ["Língua Portuguesa", "Orações coordenadas", "Orações coordenadas são independentes e ligadas por conjunções.\n\"Estudei, mas não fui bem\" é adversativa (oposição). \"Estudei e passei\" é aditiva (soma).",
      "Que conjunção indica oposição? | Mas (ou porém, contudo)\n\"Corri e cheguei a tempo\" é aditiva ou adversativa? | Aditiva"],
    ["Língua Portuguesa", "Texto dissertativo-argumentativo", "Tem introdução (com a tese), desenvolvimento (com os argumentos) e conclusão (com uma proposta de solução).\nÉ o formato da redação do ENEM.",
      "Qual parte apresenta a tese? | A introdução\nO que a conclusão deve trazer? | Uma proposta de solução"],
    ["Matemática", "Equações do 1º grau", "Resolver uma equação é encontrar o valor da incógnita.\nEm 2x + 4 = 10, tiramos 4 dos dois lados (2x = 6) e dividimos por 2 (x = 3).",
      "Resolva: x + 7 = 12 | x = 5\nResolva: 3x = 21 | x = 7\nResolva: 2x − 1 = 9 | x = 5"],
    ["Matemática", "Teorema de Pitágoras", "Em todo triângulo retângulo, o quadrado da hipotenusa é igual à soma dos quadrados dos catetos: a² = b² + c².\nExemplo: catetos 3 e 4, hipotenusa 5.",
      "Catetos 6 e 8: quanto mede a hipotenusa? | 10\nComo se chama o lado oposto ao ângulo reto? | Hipotenusa", "pitagoras"],
    ["Ciências", "Sistema digestório", "A digestão começa na boca, passa pelo esôfago e pelo estômago e termina no intestino delgado, onde os nutrientes são absorvidos.\nO intestino grosso absorve a água.",
      "Onde os nutrientes são absorvidos? | No intestino delgado\nOnde começa a digestão? | Na boca"],
    ["Ciências", "Tabela periódica", "A tabela periódica organiza os elementos químicos pelo número atômico.\nAs colunas são as famílias (propriedades parecidas) e as linhas são os períodos.",
      "Como os elementos são ordenados? | Pelo número atômico\nQual é o símbolo do oxigênio? | O"],
    ["História", "Independência do Brasil", "Em 7 de setembro de 1822, D. Pedro proclamou a independência do Brasil em relação a Portugal.\nO país se tornou um império, com D. Pedro I como imperador.",
      "Em que ano o Brasil ficou independente? | 1822\nQuem foi o primeiro imperador do Brasil? | D. Pedro I"],
    ["História", "Era Vargas", "Getúlio Vargas governou o Brasil de 1930 a 1945.\nEm 1943 criou a CLT, que reúne as leis trabalhistas, como férias e salário mínimo.",
      "O que é a CLT? | Consolidação das Leis do Trabalho\nEm que ano Vargas chegou ao poder? | 1930"],
    ["Geografia", "Globalização", "Globalização é a integração econômica, cultural e tecnológica entre os países.\nFoi acelerada pela internet e por transportes mais rápidos.",
      "Cite um fator que acelerou a globalização. | A internet ou os transportes mais rápidos"],
    ["Língua Inglesa", "Past simple", "O past simple fala de ações já terminadas: I visited my grandma yesterday.\nVerbos regulares ganham -ed. Os irregulares mudam: go → went.",
      "Qual é o passado de \"go\"? | went\nComplete: She ___ (play) yesterday. | played"]
  ]
};

export const grupoDaSerie = serie => {
  const n = parseInt(serie, 10);
  return n <= 2 ? "g1" : n <= 5 ? "g2" : n <= 7 ? "g3" : "g4";
};

/* Avisos para todas as séries. {data} é trocado pela data do evento correspondente. */
export const AVISOS_GERAIS = [
  ["Reunião de pais e responsáveis", "Será no dia {reuniao}, às 18h30, no pátio da escola.\nA presença dos responsáveis é muito importante.", 1],
  ["Não haverá aula no dia {conselho}", "Conselho de classe. As aulas voltam normalmente no dia seguinte.", 3],
  ["Campanha de vacinação na escola", "A equipe da UBS do bairro estará na escola na próxima quarta-feira, das 8h às 11h.\nTraga a carteira de vacinação.", 5],
  ["Inscrições para a Feira de Ciências", "Grupos de até 4 alunos. As inscrições são feitas com o professor de Ciências até {feiraInscricao}.", 8],
  ["Biblioteca aberta no intervalo", "A biblioteca agora também abre no intervalo para empréstimo de livros.", 12],
  ["Uso do uniforme", "Lembramos que o uso do uniforme é obrigatório.\nQuem precisar de ajuda para conseguir o uniforme pode procurar a coordenação.", 17]
];

export const AVISO_DA_SERIE = {
  "1º ano": ["Atividade em família", "Nesta semana, cada aluno vai trazer uma foto da família para a aula de História."],
  "2º ano": ["Passeio à biblioteca municipal", "Na próxima sexta-feira. A autorização assinada deve ser entregue até quarta."],
  "3º ano": ["Material de Arte", "Trazer cola, tesoura sem ponta e revistas usadas na próxima aula de Arte."],
  "4º ano": ["Olimpíada de Matemática", "As inscrições estão abertas. Interessados devem falar com o professor de Matemática."],
  "5º ano": ["Formatura do 5º ano", "A reunião para organizar a formatura será na próxima terça, às 18h."],
  "6º ano": ["Aula de campo", "Visita ao parque ecológico na próxima quinta. Trazer lanche e garrafa de água."],
  "7º ano": ["Clube de leitura", "Os encontros serão às quartas, no intervalo, na biblioteca."],
  "8º ano": ["Trabalho de Ciências", "O trabalho sobre o sistema digestório deve ser entregue impresso e em grupo."],
  "9º ano": ["Simulado preparatório", "Simulado com questões de todas as disciplinas no próximo sábado, das 8h às 12h."]
};

export const CARDAPIO = [
  ["Segunda", "Arroz, feijão e frango assado", "Salada de alface e tomate", "Banana"],
  ["Terça", "Macarrão à bolonhesa", "Cenoura ralada", "Laranja"],
  ["Quarta", "Arroz, feijão e carne de panela com batata", "Couve refogada", "Maçã"],
  ["Quinta", "Galinhada", "Salada de repolho", "Melancia"],
  ["Sexta", "Arroz, feijão e peixe assado", "Purê de abóbora", "Mamão"]
];

/* Feriados nacionais (mês-dia) usados nas datas da agenda */
export const FERIADOS = [
  ["04-21", "Tiradentes"], ["05-01", "Dia do Trabalho"], ["09-07", "Independência do Brasil"],
  ["10-12", "Nossa Senhora Aparecida"], ["11-02", "Finados"], ["11-15", "Proclamação da República"],
  ["11-20", "Dia Nacional de Zumbi e da Consciência Negra"], ["12-25", "Natal"]
];
