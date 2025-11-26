import React, { useEffect, useMemo, useState } from "react";
import { cardPool } from "./cardsData";
import messages from "./i18n.json";


const makeId = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 7)}`;

const shuffle = (list) => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildDeck = () =>
  shuffle(cardPool)
    .slice(0, 6)
    .map((card, index) => ({
      ...card,
      instanceId: `${card.id}-${index}-${makeId("card")}`
    }));

function Card({ card, animate, className = "", style = {}, onHighlight, onUnhighlight, disableTilt = false }) {
  const [tilt, setTilt] = useState({ x: "0deg", y: "0deg", mx: "50%", my: "50%" });
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = React.useRef(null);

  useEffect(() => {
    if (animate && cardRef.current && !hasAnimated) {
      cardRef.current.classList.add("from-deck");
      requestAnimationFrame(() => {
        cardRef.current.classList.add("into-hand");
        setHasAnimated(true);
      });
    }
  }, [animate, hasAnimated]);

  const updateTilt = (event) => {
    if (disableTilt) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clampX = Math.max(0, Math.min(1, x));
    const clampY = Math.max(0, Math.min(1, y));
    const tiltX = (clampX - 0.5) * 12;
    const tiltY = (0.5 - clampY) * 12;

    setTilt({
      mx: `${clampX * 100}%`,
      my: `${clampY * 100}%`,
      x: `${tiltX}deg`,
      y: `${tiltY}deg`
    });
  };

  const resetTilt = () => {
    if (disableTilt) return;
    setTilt({ x: "0deg", y: "0deg", mx: "50%", my: "50%" });
  };

  return (
    <article
      ref={cardRef}
      className={`card type-${card.type} ${className}`}
      style={{
        "--card-accent": card.accent,
        "--card-accent-gradient": card.accentGradient,
        "--pip-color": card.accent,
        "--tilt-x": tilt.x,
        "--tilt-y": tilt.y,
        "--mx": tilt.mx,
        "--my": tilt.my,
        ...style
      }}
      onPointerMove={updateTilt}
      onPointerEnter={() => {
        onHighlight?.(card);
      }}
      onPointerLeave={() => {
        resetTilt();
        onUnhighlight?.();
      }}
      onFocus={() => {
        resetTilt();
        onHighlight?.(card);
      }}
      onBlur={() => {
        onUnhighlight?.();
      }}
      tabIndex={0}
    >
      <div className="card__foil" />
      <div className="card__shine" />
      <div className="card__frame" />

      <div className="card__shell">
        <div className="card__top">
          <div className="card__name">{card.name}</div>
          <span className="tag">{card.typeLabel}</span>
        </div>

        <div
          className="card__art"
          aria-label="art"
          style={{
            "--card-art": card.art ? `url(${card.art})` : undefined
          }}
        />

        <div className="meta">
          <div className="cost">
            <span>{card.cost}</span>
            <span className="pips">{renderPips(card.cost)}</span>
          </div>
          <span className="rarity">{card.rarityLabel}</span>
        </div>

        <div className="card__effect">{card.effect}</div>

        <div className="card__footer">
          <span>{card.type === "creature" ? "HP 3 / POW 2" : "Speedcast"}</span>
          <span className="crystal" aria-hidden="true" />
        </div>
      </div>

      <div className="card__grain" />
    </article>
  );
}

const renderPips = (cost) => new Array(cost).fill(0).map((_, i) => <span className="pip" key={i} />);

function DeckStack({ count }) {
  const layers = Math.min(3, count);
  return (
    <div className={`deck-stack ${count === 0 ? "empty-deck" : ""}`} aria-label="deck">
      {new Array(layers).fill(0).map((_, idx) => (
        <div className="card-ghost" key={idx} />
      ))}
    </div>
  );
}

export default function App() {
  const [deck, setDeck] = useState([]);
  const [hand, setHand] = useState([]);
  const [lastDrawnId, setLastDrawnId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lang, setLang] = useState("zh");
  const toggleLang = () => setLang((prev) => (prev === "en" ? "zh" : "en"));

  const t = useMemo(
    () => (key) => {
      const value = messages[lang]?.[key] ?? messages.en[key];
      return value ?? key;
    },
    [lang]
  );

  const typeLabel = (type) => messages[lang]?.type?.[type] ?? messages.en.type[type] ?? type;
  const rarityLabel = (rarity) => messages[lang]?.rarity?.[rarity] ?? messages.en.rarity[rarity] ?? rarity;

  useEffect(() => {
    const freshDeck = buildDeck();
    setDeck(freshDeck);
    setHand([]);
    setLastDrawnId(null);
  }, []);

  const drawCard = () => {
    if (isDrawing || deck.length === 0) return;
    setIsDrawing(true);
    const [nextCard, ...rest] = deck;
    setDeck(rest);
    setHand((prevHand) => [...prevHand, nextCard]);
    setLastDrawnId(nextCard.instanceId);
    setTimeout(() => setIsDrawing(false), 320);
  };

  const getFanStyle = (count, index) => {
    if (count <= 1) {
      return { transform: "translateX(0px) translateY(0px) rotate(0deg)", zIndex: 20 };
    }
    const isNarrow = typeof window !== "undefined" && window.innerWidth <= 720;
    const spread = Math.min(26, (70 / (count - 1)) * 1.6); // tighten when more cards
    const center = (count - 1) / 2;
    const baseScale = count > 6 ? Math.max(0.55, 6 / count) : 1;
    const scale = isNarrow ? Math.min(0.7, baseScale) : baseScale;
    const angle = (index - center) * spread * (isNarrow ? 0.45 : 0.55);
    const offsetX = (index - center) * (isNarrow ? 28 : 40) * scale;
    const offsetY = -Math.abs(index - center) * 6 * scale;
    return {
      translateX: `${offsetX}px`,
      translateY: `${offsetY}px`,
      rotate: `${angle}deg`,
      zIndex: 100 + index,
      scale
    };
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="eyebrow">Prototype</p>
          <h1>{t("title")}</h1>
          <p className="lede">{t("lede")}</p>
        </div>
        <div className="controls">
          <button className="cta cta--ghost" onClick={toggleLang}>
            {lang === "en" ? "中文" : "EN"}
          </button>
          <div className="counter pill">
            <span id="deck-count">{deck.length}</span>
            <small>{t("cardsInDeck")}</small>
          </div>
        </div>
      </header>

      <main className="board board--vertical">
        <section className="table-top table-top--deck-only">
          <div className="deck-column deck-column--solo">
            <DeckStack count={deck.length} />
            <button
              id="draw-btn"
              className="cta cta--wide"
              onClick={drawCard}
              disabled={deck.length === 0 || isDrawing}
            >
              {deck.length === 0 ? t("deckEmpty") : isDrawing ? "..." : t("draw")}
            </button>
          </div>
        </section>

        <section className="hand-belt" aria-label="hand">
          <div className="hand hand--belt" id="hand">
            {hand.map((card, idx) => {
              const fanStyle = getFanStyle(hand.length, idx);
              const localizedCard = {
                ...card,
                name: lang === "zh" && card.nameZh ? card.nameZh : card.name,
                effect: lang === "zh" && card.effectZh ? card.effectZh : card.effect,
                typeLabel: typeLabel(card.type),
                rarityLabel: rarityLabel(card.rarity)
              };
              return (
                <Card
                  key={card.instanceId}
                  card={localizedCard}
                  animate={card.instanceId === lastDrawnId}
                  className="card--fan"
                  disableTilt
                  style={{
                    "--fan-translate-x": fanStyle.translateX,
                    "--fan-translate-y": fanStyle.translateY,
                    "--fan-rotate": fanStyle.rotate,
                    "--fan-z": fanStyle.zIndex,
                    "--fan-scale": fanStyle.scale
                  }}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
