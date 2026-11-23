import type { CSSProperties } from "react";
import { NOME_DO_PORTAL, SLOGAN, SLOGAN_LONGO } from "@/lib/site";
import { CORES_DA_PREVIA as COR } from "./cores";
import { FAMILIA } from "./fontes";
import {
  EDITORIAS_DA_PREVIA,
  reguaDoTitulo,
  TAMANHO_DA_PREVIA,
  type TextosDaPrevia,
} from "./previa";

/*
 * Artes da prévia do link (T02, direção A · Faixa noturna), no JSX que o `ImageResponse`
 * (Satori) entende: todo contêiner com `display: flex`, medidas em px, sem grid. Os
 * estilos seguem o mockup aprovado (`docs/design/T02-previa-do-link/direcao-a-faixa-noturna.html`).
 */

const [ZONA, MISTA] = NOME_DO_PORTAL.split(" ");

const FUNDO: CSSProperties = {
  display: "flex",
  width: TAMANHO_DA_PREVIA.width,
  height: TAMANHO_DA_PREVIA.height,
  position: "relative",
  overflow: "hidden",
  flexDirection: "column",
  backgroundColor: COR.noite,
  backgroundImage: `radial-gradient(circle at 92% 0%, ${COR.noiteClara} 0%, ${COR.noite} 60%)`,
  color: COR.marfim,
};

const FILETE = `1px solid ${COR.filete}`;

const MONO: CSSProperties = {
  fontFamily: FAMILIA.mono,
  fontWeight: 500,
};

/** Losango em SVG: o Geist Mono não tem ◇ nem ◆, e o Satori não busca fonte substituta. */
function Losango({
  tamanho,
  cor,
  vazado,
}: {
  tamanho: number;
  cor: string;
  vazado: boolean;
}) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 16 16">
      <path
        d="M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z"
        fill={vazado ? "none" : cor}
        stroke={cor}
        strokeWidth={vazado ? 2 : 0}
      />
    </svg>
  );
}

/** "Zona *Mista*": dois spans na linha de base, sem espaço em texto entre eles. */
function Wordmark({
  tamanho,
  espacamento,
  espacamentoDoItalico,
  recuo,
}: {
  tamanho: number;
  espacamento: number;
  espacamentoDoItalico: number;
  recuo: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontFamily: FAMILIA.serifa,
        fontSize: tamanho,
        lineHeight: 1,
        letterSpacing: espacamento,
        color: COR.marfim,
      }}
    >
      <span>{ZONA}</span>
      <span
        style={{
          fontStyle: "italic",
          marginLeft: recuo,
          letterSpacing: espacamentoDoItalico,
          color: COR.marfim,
        }}
      >
        {MISTA}
      </span>
    </div>
  );
}

function Traco({ style }: { style: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        width: 72,
        height: 6,
        backgroundColor: COR.ambar,
        ...style,
      }}
    />
  );
}

/** Selo "◇ Exemplo" das matérias fictícias. */
function Selo() {
  return (
    <div style={{ display: "flex", marginLeft: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: COR.ambar,
          color: COR.tintaDoSelo,
          fontFamily: FAMILIA.mono,
          fontWeight: 600,
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: 2,
          textTransform: "uppercase",
          padding: "12px 17px",
        }}
      >
        <Losango tamanho={24} cor={COR.tintaDoSelo} vazado />
        <span style={{ marginLeft: 12 }}>Exemplo</span>
      </div>
    </div>
  );
}

/** Arte da matéria: wordmark e editoria em cima, título ancorado embaixo, slogan e data no pé. */
export function ArteDaMateria({ textos }: { textos: TextosDaPrevia }) {
  const regua = reguaDoTitulo(textos.titulo);
  return (
    <div style={{ ...FUNDO, padding: "50px 72px 46px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 22,
          borderBottom: FILETE,
        }}
      >
        <Wordmark
          tamanho={52}
          espacamento={-1.8}
          espacamentoDoItalico={-2.3}
          recuo={5}
        />
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              ...MONO,
              fontSize: 24,
              color: COR.cinza,
              letterSpacing: 2,
            }}
          >
            {textos.numero}
          </span>
          <span
            style={{
              ...MONO,
              fontWeight: 600,
              fontSize: 24,
              color: COR.ambar,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              marginLeft: 12,
            }}
          >
            {textos.editoria}
          </span>
          {textos.ficticio && <Selo />}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexGrow: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 30,
        }}
      >
        <Traco style={{ marginBottom: 24 }} />
        <div
          style={{
            display: regua.lineClamp ? "block" : "flex",
            fontFamily: FAMILIA.serifa,
            fontSize: regua.fontSize,
            lineHeight: 1,
            letterSpacing: regua.letterSpacing,
            color: COR.marfim,
            textWrap: "balance",
            ...(regua.lineClamp ? { lineClamp: regua.lineClamp } : {}),
          }}
        >
          {textos.titulo}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 20,
          borderTop: FILETE,
        }}
      >
        <div
          style={{
            ...MONO,
            display: "flex",
            alignItems: "center",
            color: textos.ficticio ? COR.marfim : COR.cinza,
            fontSize: 20,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {textos.ficticio ? (
            <>
              <Losango tamanho={18} cor={COR.ambar} vazado />
              <span style={{ marginLeft: 12 }}>{textos.rodape}</span>
            </>
          ) : (
            <>
              <span>{textos.rodape}</span>
              <span style={{ marginLeft: 12, display: "flex" }}>
                <Losango tamanho={16} cor={COR.ambar} vazado={false} />
              </span>
            </>
          )}
        </div>
        <span
          style={{
            ...MONO,
            fontSize: 20,
            color: COR.cinza,
            letterSpacing: 1.5,
          }}
        >
          {textos.data}
        </span>
      </div>
    </div>
  );
}

/** Imagem padrão do portal: capa, editorias, tags e busca. */
export function ArtePadrao() {
  return (
    <div style={{ ...FUNDO, padding: "52px 72px 48px" }}>
      <div
        style={{
          ...MONO,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 22,
          borderBottom: FILETE,
          fontSize: 20,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: COR.cinza,
        }}
      >
        <span>{SLOGAN_LONGO[0]}</span>
        <span>{SLOGAN_LONGO[1]}</span>
      </div>

      <div
        style={{
          display: "flex",
          flexGrow: 1,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Wordmark
          tamanho={196}
          espacamento={-6.9}
          espacamentoDoItalico={-8.8}
          recuo={20}
        />
        <div style={{ display: "flex", alignItems: "center", marginTop: 26 }}>
          <Traco style={{ marginRight: 22 }} />
          <span
            style={{
              ...MONO,
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: COR.ambar,
            }}
          >
            {SLOGAN}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          paddingTop: 20,
          borderTop: FILETE,
        }}
      >
        {EDITORIAS_DA_PREVIA.map(({ numero, rotulo }, i) => (
          <div
            key={numero}
            style={{
              display: "flex",
              alignItems: "baseline",
              marginRight: i === EDITORIAS_DA_PREVIA.length - 1 ? 0 : 30,
            }}
          >
            <span
              style={{
                ...MONO,
                fontSize: 16,
                color: COR.cinza,
                marginRight: 7,
              }}
            >
              {numero}
            </span>
            <span
              style={{
                fontFamily: FAMILIA.sans,
                fontWeight: 600,
                fontSize: 24,
                color: COR.marfim,
              }}
            >
              {rotulo}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
