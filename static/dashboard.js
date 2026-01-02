/**
 * Dashboard - Visual Analytics with Bento Grid Layout
 * Renders KPI bar, weapon classification, fight detection, and crown abnormal charts
 */

(function() {
    let initialized = false;

    async function fetchStats() {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
        return res.json();
    }

    // === KPI Bar ===
    function renderKpiBar(stats) {
        const container = document.getElementById('kpi-bar');
        if (!container) return;

        // Calculate totals
        const fightTotal = stats.fight_detection?.values.reduce((a, b) => a + b, 0) || 0;
        const crownTotal = stats.crown_abnormal?.values.reduce((a, b) => a + b, 0) || 0;
        const weaponTotal = stats.weapon_classification?.values.reduce((a, b) => a + b, 0) || 0;
        const grandTotal = fightTotal + crownTotal + weaponTotal;

        // Alert count (Fight + Abnormal)
        const alertCount = (stats.fight_detection?.values[0] || 0) + (stats.crown_abnormal?.values[0] || 0);

        container.innerHTML = `
            <div class="kpi-items">
                <div class="kpi-item">
                    <span class="kpi-value">${grandTotal}</span>
                    <span class="kpi-label">Total Events</span>
                </div>
                <div class="kpi-item kpi-alert">
                    <span class="kpi-value">${alertCount}</span>
                    <span class="kpi-label">Alerts</span>
                </div>
                <div class="kpi-item kpi-status">
                    <span class="kpi-value status-live">LIVE</span>
                    <span class="kpi-label">System</span>
                </div>
            </div>
        `;
    }

    // === Weapon Classification (Horizontal Bars) ===
    function renderWeaponChart(data) {
        const container = document.getElementById('weapon-chart');
        if (!container) return;

        const maxValue = Math.max(...data.values);

        // Sort by value descending
        const sorted = data.x_axis
            .map((label, i) => ({ label, value: data.values[i] }))
            .sort((a, b) => b.value - a.value);

        const barsHtml = sorted.map(item => {
            const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return `
                <div class="h-bar-row">
                    <span class="h-bar-label">${item.label}</span>
                    <div class="h-bar-track">
                        <div class="h-bar-fill" style="width: ${widthPercent}%"></div>
                    </div>
                    <span class="h-bar-value">${item.value}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="h-bar-chart">${barsHtml}</div>`;
    }

    // === Fight Detection (Donut Chart) ===
    function renderFightChart(data) {
        const container = document.getElementById('fight-chart');
        if (!container) return;

        const total = data.values.reduce((a, b) => a + b, 0);
        const fightValue = data.values[0] || 0;
        const noFightValue = data.values[1] || 0;
        const fightPercent = total > 0 ? (fightValue / total) * 100 : 0;

        container.innerHTML = `
            <div class="donut-wrapper">
                <div class="donut-chart" style="--fight-percent: ${fightPercent}%;">
                    <div class="donut-center">
                        <span class="donut-total">${total}</span>
                        <span class="donut-label">Total</span>
                    </div>
                </div>
                <div class="donut-legend">
                    <div class="legend-item legend-fight">
                        <span class="legend-dot"></span>
                        <span class="legend-label">Fight</span>
                        <span class="legend-value">${fightValue}</span>
                    </div>
                    <div class="legend-item legend-safe">
                        <span class="legend-dot"></span>
                        <span class="legend-label">No Fight</span>
                        <span class="legend-value">${noFightValue}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // === Crown Abnormal (Progress Bar) ===
    function renderCrownChart(data) {
        const container = document.getElementById('crown-chart');
        if (!container) return;

        const total = data.values.reduce((a, b) => a + b, 0);
        const abnormalValue = data.values[0] || 0;
        const normalValue = data.values[1] || 0;
        const abnormalPercent = total > 0 ? (abnormalValue / total) * 100 : 0;

        container.innerHTML = `
            <div class="progress-wrapper">
                <div class="progress-row">
                    <div class="progress-info">
                        <span class="progress-label">Normal</span>
                        <span class="progress-value">${normalValue}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-normal" style="width: ${100 - abnormalPercent}%"></div>
                    </div>
                </div>
                <div class="progress-row">
                    <div class="progress-info">
                        <span class="progress-label">Abnormal</span>
                        <span class="progress-value">${abnormalValue}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-alert" style="width: ${abnormalPercent}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // === Main Render ===
    async function renderDashboard() {
        try {
            const stats = await fetchStats();

            // Render each chart into its container
            renderKpiBar(stats);

            if (stats.weapon_classification) {
                renderWeaponChart(stats.weapon_classification);
            }

            if (stats.fight_detection) {
                renderFightChart(stats.fight_detection);
            }

            if (stats.crown_abnormal) {
                renderCrownChart(stats.crown_abnormal);
            }
        } catch (e) {
            console.error('Dashboard error:', e);
            const weaponChart = document.getElementById('weapon-chart');
            if (weaponChart) {
                weaponChart.innerHTML = `<div class="error">Error: ${e.message}</div>`;
            }
        }
    }

    // Expose init function globally
    window.initDashboard = function() {
        if (initialized) return;
        initialized = true;
        renderDashboard();
    };
})();
