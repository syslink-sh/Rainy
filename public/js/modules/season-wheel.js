
/**
 * Season Wheel Component
 * Renders a circular SVG chart showing seasons and highlighting the current month/season.
 */

export const renderSeasonWheel = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const date = new Date();
    // Month is 0-indexed (0 = Jan, 8 = Sep)
    // User requirement: Month 9 (Sep) is at top.
    // Our logical months: 1..12
    const currentMonth = date.getMonth() + 1;

    // Configuration from Prompt
    // 9 at Top (12 o'clock). 
    // Clockwise direction.
    // Segments:
    // Summer: 9, 10, 11 (Start of 9 to End of 11)
    // Fall: 12, 1, 2
    // Autumn: 3, 4, 5, 6
    // Winter: 7, 8

    // We map logical 1-12 to degrees.
    // 12 o'clock is -90 degrees in SVG (0 is 3 o'clock).
    // We want Center of Month 9 to be at -90 deg.
    // Each month is 30 deg.
    // Month 9 center = -90.
    // Month 9 range: -105 to -75.

    // Let's define the start angles for each month relative to 0 at 3 o'clock? 
    // Or just rotate the whole group so 9 is at top.
    // If standard pie chart starts at 0 (3 o'clock):
    // 9 is at top (-90).
    // So we need to rotate such that 9 is at -90.

    // Detect language
    const lang = document.documentElement.lang || 'en';
    const isAr = lang === 'ar';

    const seasonNames = {
        Winter: isAr ? 'الشتاء' : 'Winter',
        Spring: isAr ? 'الربيع' : 'Spring',
        Summer: isAr ? 'الصيف' : 'Summer',
        Autumn: isAr ? 'الخريف' : 'Autumn'
    };

    // Let's define segments data
    const seasons = [
        { name: seasonNames.Winter, months: [12, 1, 2], color: '#A5F2F3', labelColor: '#333' },
        { name: seasonNames.Spring, months: [3, 4], color: '#98FB98', labelColor: '#333' },
        { name: seasonNames.Summer, months: [5, 6, 7, 8, 9], color: '#FFD700', labelColor: '#333' },
        { name: seasonNames.Autumn, months: [10, 11], color: '#FFA07A', labelColor: '#333' }
    ];

    // Helper: polarity to cartesian
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const describeArc = (x, y, radius, startAngle, endAngle) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        const d = [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "L", x, y,
            "L", start.x, start.y
        ].join(" ");
        return d;
    };

    const describeArcCurve = (x, y, radius, startAngle, endAngle) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        // Just the arc, no line to center
        const d = [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
        return d;
    };

    // Total width/height
    const size = 420;
    const cx = size / 2;
    const cy = size / 2;
    const rSeason = 160;
    const rMonth = 185;

    // We need to map Month Number to Start Angle.
    // Month 9 center is 0 deg (Top).
    // Slice 9: -15 to +15.
    // Slice 10: 15 to 45.
    // ...
    // Formula: (Month - 9) * 30. 
    // adjust for the fact that months wrap: 9->0, 10->30, 12->90, 1->120...

    const getMonthCenterAngle = (m) => {
        // Normalize 9 to be 0 position
        // 9 -> 0
        // 10 -> 30
        // ...
        // 1 -> 120 ( (1 + 12 - 9) * 30 )
        let diff = m - 9;
        if (diff < 0) diff += 12;
        return diff * 30;
    };

    let svgContent = '';

    // 1. Draw Season Slices
    // Helper: Get days in month
    const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();

    // Helper: Darken color
    const darkenColor = (hex, percent) => {
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        r = parseInt(r * (100 - percent) / 100); r = (r < 0) ? 0 : r;
        g = parseInt(g * (100 - percent) / 100); g = (g < 0) ? 0 : g;
        b = parseInt(b * (100 - percent) / 100); b = (b < 0) ? 0 : b;
        const toHex = (c) => (c < 16 ? "0" : "") + c.toString(16);
        return "#" + toHex(r) + toHex(g) + toHex(b);
    };

    seasons.forEach(season => {
        const firstM = season.months[0];
        const lastM = season.months[season.months.length - 1];

        const startA = getMonthCenterAngle(firstM) - 15;
        let endA = getMonthCenterAngle(lastM) + 15;

        // Check if this season contains current month
        const isCurrent = season.months.includes(currentMonth);
        const opacity = isCurrent ? 1 : 0.6;

        const pathFull = describeArc(cx, cy, rSeason, startA, endA);

        // 1. Draw Full Season (Background + Standard Outline)
        svgContent += `<path d="${pathFull}" fill="${season.color}" stroke="#000" stroke-width="1" fill-opacity="${opacity}" />`;

        if (isCurrent) {
            // PROGRESS CALCULATION
            const now = new Date();
            const currentYear = now.getFullYear();
            let startYear = currentYear;
            if (season.months.includes(12) && season.months.includes(1) && currentMonth <= 2) {
                startYear = currentYear - 1;
            }

            const startDate = new Date(startYear, firstM - 1, 1);

            let totalDays = 0;
            season.months.forEach(m => {
                let mYear = startYear;
                if (season.months.includes(12) && m < 12) mYear = startYear + 1;
                totalDays += getDaysInMonth(m, mYear);
            });

            const diffTime = now - startDate;
            const daysPast = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            let progress = daysPast / totalDays;
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;

            // Split Arcs
            let totalAngle = endA - startA;
            if (totalAngle < 0) totalAngle += 360;

            const anglePast = totalAngle * progress;
            const splitAngle = startA + anglePast;

            // 2. Draw Progress Curve (Darker Outline, Outer Rim Only)
            const pastColor = darkenColor(season.color, 40);
            const curvePast = describeArcCurve(cx, cy, rSeason, startA, splitAngle);

            // Overlay the progress ring on the edge
            svgContent += `<path d="${curvePast}" fill="none" stroke="${pastColor}" stroke-width="8" stroke-linecap="round" />`;
        }

        // Label rendering (remains same)
        // Angle for text is midpoint
        // Handle wrap-around for Summer (Start > End implies crossing 0)
        let normalizedStart = startA;
        let normalizedEnd = endA;
        if (normalizedEnd < normalizedStart) {
            normalizedEnd += 360;
        }

        let midAngle = (normalizedStart + normalizedEnd) / 2;
        // Normalize midAngle to 0-360 for rotation check
        let rotationAngle = midAngle;
        if (rotationAngle < 0) rotationAngle += 360;
        if (rotationAngle >= 360) rotationAngle -= 360;

        // Position text
        const textPos = polarToCartesian(cx, cy, rSeason * 0.65, midAngle);

        // Flip text if it appears upside down (between 90 and 270 degrees)
        // 0 is Top, 90 is Right, 180 is Bottom, 270 is Left.
        // SVG Rotation is clockwise.
        // Angles 90-270 (Bottom half) are upside down.
        let textRotate = midAngle;
        if (rotationAngle > 90 && rotationAngle < 270) {
            textRotate += 180;
        }

        svgContent += `
            <text x="${textPos.x}" y="${textPos.y}" 
                  fill="${season.labelColor}" 
                  font-family="var(--font-main), sans-serif" 
                  font-weight="bold" 
                  font-size="14"
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  transform="rotate(${textRotate}, ${textPos.x}, ${textPos.y})">
                ${season.name}
            </text>
        `;
    });

    // 2. Draw Center Dot
    svgContent += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--text-primary)" />`;

    // 3. Draw Month Numbers Ring
    for (let m = 1; m <= 12; m++) {
        const isCurrentM = (m === currentMonth);
        const angle = getMonthCenterAngle(m);
        const pos = polarToCartesian(cx, cy, (rSeason + 15), angle); // slight offset from season wheel

        const fontWeight = isCurrentM ? '900' : 'normal';
        const fontSize = isCurrentM ? '16' : '12';
        const fill = 'var(--text-primary)'; // Use CSS variable for theme support

        // Highlight indicator for current month
        if (isCurrentM) {
            svgContent += `<circle cx="${pos.x}" cy="${pos.y}" r="12" fill="none" stroke="var(--text-primary)" stroke-width="2" />`;
        }

        svgContent += `
            <text x="${pos.x}" y="${pos.y}" 
                  fill="${fill}" 
                  font-family="Arial, sans-serif" 
                  font-weight="${fontWeight}" 
                  font-size="${fontSize}"
                  text-anchor="middle" 
                  dominant-baseline="middle">
                ${m}
            </text>
        `;
    }

    const svg = `
        <svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" style="max-width: 100%; display: block; margin: 0 auto;">
            ${svgContent}
        </svg>
    `;

    container.innerHTML = svg;
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', `Season calendar showing current month ${currentMonth}`);
};
