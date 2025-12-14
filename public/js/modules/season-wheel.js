
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

    // Total width/height
    const size = 420; // Increased from 300
    const cx = size / 2;
    const cy = size / 2;
    const rSeason = 160; // Increased from 120
    const rMonth = 185;  // Increased from 140

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
    seasons.forEach(season => {
        // Consecutive months in our specific order logic:
        // Summer: 9,10,11. 
        // Start Angle = Center of 9 MINUS 15 deg.
        // End Angle = Center of 11 PLUS 15 deg.

        const firstM = season.months[0];
        const lastM = season.months[season.months.length - 1];

        const startA = getMonthCenterAngle(firstM) - 15;
        // Handle wrap around for end angle logic
        // Only Fall wraps: 12, 1, 2.
        // center(12)=90, center(1)=120, center(2)=150.
        // start=75, end=165. Correct.

        let endA = getMonthCenterAngle(lastM) + 15;

        // Render Path
        // Check if this season contains current month
        const isCurrent = season.months.includes(currentMonth);
        const opacity = isCurrent ? 1 : 0.6;
        const stroke = isCurrent ? '#333' : 'none';
        const strokeWidth = isCurrent ? 2 : 0;

        const path = describeArc(cx, cy, rSeason, startA, endA);

        svgContent += `
            <path d="${path}" fill="${season.color}" stroke="${stroke}" stroke-width="${strokeWidth}" fill-opacity="${opacity}" />
        `;

        // Label
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
        <svg viewBox="0 0 ${size} ${size}" width="500" height="auto" style="max-width: 600px; display: block; margin: 0 auto;">
            ${svgContent}
        </svg>
    `;

    container.innerHTML = svg;
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', `Season calendar showing current month ${currentMonth}`);
};
