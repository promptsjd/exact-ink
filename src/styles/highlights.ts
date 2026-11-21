
type HighlightStyle = {
    fillStyle: string;
    shadowColor?: string;
    shadowBlur?: number;
};

export const highlightStyles: Record<string, HighlightStyle> = {
    spelling: {
        fillStyle: 'rgba(252, 165, 165, 0.65)',
        shadowColor: 'white',
        shadowBlur: 2,
    },
    capitalization: {
        fillStyle: 'rgba(253, 224, 71, 0.65)',
        shadowColor: 'white',
        shadowBlur: 2,
    },
    punctuation: {
        fillStyle: 'rgba(216, 180, 254, 0.65)',
        shadowColor: 'white',
        shadowBlur: 2,
    },
    added: {
        fillStyle: 'rgba(147, 197, 253, 0.65)',
        shadowColor: 'white',
        shadowBlur: 2,
    },
    removed: {
        fillStyle: 'rgba(251, 146, 60, 1)',
        shadowColor: 'white',
        shadowBlur: 2,
    },
};
