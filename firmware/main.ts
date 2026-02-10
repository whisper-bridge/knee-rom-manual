// --- USER DISPLAY ---
function showAngle(angle: number) {
    light.clear()
    // Map 0-135° to LED 0-9
    ledIndex = Math.floor(angle / FLEXION_LIMIT * 10)
    ledIndex = Math.max(0, Math.min(9, ledIndex))
    // Color: Green (0-45°) -> Yellow (45-90°) -> Red
    // (90-135°)
    color2 = 65280
    if (angle > 90) {
        color2 = 16711680
    } else if (angle > 45) {
        color2 = 16776960
    }
    light.setPixelColor(ledIndex, color2)
}
// --- COMPLEMENTARY FILTER ---
function updateFilter() {
    now = control.millis()
    dt = (now - lastTime) / 1000
    lastTime = now
    // Keep dt reasonable
    if (dt < 0.001) {
        dt = 0.001
    }
    if (dt > 0.1) {
        dt = 0.1
    }
    let accelAngle = getAccelAngle();
    let gyroRate = getGyroRate();
    // Complementary filter
    pitch = ALPHA * (pitch + gyroRate * dt) + (1 - ALPHA) * accelAngle
    // Clamp to valid range
    if (pitch < 0) {
        pitch = 0
    }
    if (pitch > FLEXION_LIMIT) {
        pitch = FLEXION_LIMIT
    }
}
// --- SIMPLE DRIFT CORRECTION --- If not moving for 1
// second, reset to accelerometer
function checkDrift() {
    gyroRate2 = input.rotation(Rotation.Pitch) - gyroBias
    if (Math.abs(gyroRate2) < 0.5) {
        cycleCount += 1
        if (cycleCount > 50) {
            pitch = getAccelAngle();
            cycleCount = 0
        }
    } else {
        cycleCount = 0
    }
}
// --- CALIBRATION --- Press Button A: Sets current
// position as 0° (full extension)
function calibrate() {
    // Visual feedback: Blue = calibrating
    light.setAll(0x0000FF)
    music.playTone(440, 200)
    for (let i = 0; i <= CALIBRATION_SAMPLES - 1; i++) {
        sumGyro += input.rotation(Rotation.Pitch)
        sumAccel += getAccelAngle()
        pause(SAMPLE_PERIOD)
        // Progress indicator
        if (i % 25 == 0) {
            light.setPixelColor(i / 25, 0x00FFFF)
        }
    }
    // Calculate biases
    gyroBias = sumGyro / CALIBRATION_SAMPLES
    // Set current accelerometer angle as zero reference
    // This means: whatever angle the knee is at now = 0°
    currentAccelAngle = sumAccel / CALIBRATION_SAMPLES
    // Reset everything to zero
    pitch = 0
    lastTime = control.millis()
    // Clear all tracking data
    sampleBuffer = []
    maxFlexion = 0
    maxExtension = 180
    rom = 0
    cycleCount = 0
    currentAngle = 0
    quality = 100
    isCalibrated = true
    // Success feedback
    light.setAll(0x00FF00)
    music.playTone(880, 500)
    pause(500)
    light.clear()
}
// --- ROM TRACKING ---
function updateROM(angle: number) {
    // Track max angles
    if (angle > maxFlexion) {
        maxFlexion = angle
    }
    if (angle < maxExtension) {
        maxExtension = angle
    }
    rom = maxFlexion - maxExtension
    // Detect rep completion (went to extension after
    // flexion)
    if (angle < 10 && maxFlexion > 30) {
        // Rep complete!
        music.playTone(523, 100)
        console.logValue("rep_rom", rom)
        // Reset for next rep
        maxFlexion = 0
        maxExtension = 180
    }
}
// --- OUTPUT ---
function sendData() {
    console.logValue("angle", Math.round(currentAngle))
    console.logValue("rom", Math.round(rom))
    console.logValue("max_flex", Math.round(maxFlexion))
}
// --- BUTTON HANDLERS ---
input.buttonA.onEvent(ButtonEvent.Click, function () {
    calibrate()
})
input.buttonB.onEvent(ButtonEvent.Click, function () {
    // Reset ROM only (keep calibration)
    maxFlexion = 0
    maxExtension = 180
    rom = 0
    music.playTone(600, 200)
    light.setAll(0xFFFFFF)
    pause(100)
    light.clear()
})
let isCalibrated = false
let rom = 0
let maxFlexion = 0
let currentAccelAngle = 0
let sumAccel = 0
let sumGyro = 0
let cycleCount = 0
let gyroRate2 = 0
let dt = 0
let now = 0
let color2 = 0
let ledIndex = 0
let lastTime = 0
let quality = 0
let maxExtension = 0
let FLEXION_LIMIT = 0
let CALIBRATION_SAMPLES = 0
let ALPHA = 0
let SAMPLE_PERIOD = 0
let currentAngle: number = 0
let sampleBuffer: number[] = []
let gyroBias: number = 0
let pitch: number = 0
// ==========================================
// MEDICAL-GRADE KNEE ROM TRACKER v2.1 Simplified
// Error Detection & Proper Calibration
// ========================================== ---
// CONFIGURATION ---
SAMPLE_PERIOD = 20
ALPHA = 0.98
CALIBRATION_SAMPLES = 100
let SMOOTHING_WINDOW = 5
FLEXION_LIMIT = 135
maxExtension = 180
quality = 100
// --- SIMPLE ERROR DETECTION --- Just check if values
// are reasonable, don't over-complicate
function checkSensors(): boolean {
    let ax = input.acceleration(Dimension.X);
    let ay = input.acceleration(Dimension.Y);
    let az = input.acceleration(Dimension.Z);

    // Simple check: are accelerometer values in valid range?
    // CPX accelerometer range is +/- 1024 (2g)
    if (Math.abs(ax) > 1500 || Math.abs(ay) > 1500 || Math.abs(az) > 1500) {
        light.setAll(0xFF0000);  // Red = error
        return false;
    }

    return true;
}
// --- SENSOR READING ---
function getAccelAngle(): number {
    let ax2 = input.acceleration(Dimension.X);
    let ay2 = input.acceleration(Dimension.Y);
    let az2 = input.acceleration(Dimension.Z);

    // Calculate pitch: atan2(-x, sqrt(y² + z²))
    return Math.atan2(-ax2, Math.sqrt(ay2 * ay2 + az2 * az2)) * (180 / Math.PI);
}
function getGyroRate(): number {
    return input.rotation(Rotation.Pitch) - gyroBias;
}
// --- DATA SMOOTHING ---
function smoothAngle(angle: number): number {
    sampleBuffer.push(angle);
    if (sampleBuffer.length > SMOOTHING_WINDOW) {
        sampleBuffer.shift();
    }

    let sum = 0;
    for (let j = 0; j < sampleBuffer.length; j++) {
        sum += sampleBuffer[j];
    }
    return sum / sampleBuffer.length;
}
// --- MAIN PROGRAM --- Startup: Yellow = waiting for
// calibration
light.setAll(0xFFFF00)
lastTime = control.millis()
forever(function () {
    // Check sensors first
    if (!(checkSensors())) {
        pause(SAMPLE_PERIOD)
        return;
    }
    // Wait for calibration
    if (!(isCalibrated)) {
        // Blink yellow
        light.setPixelColor(0, 0xFFFF00)
        pause(SAMPLE_PERIOD)
        return;
    }
    // Main processing
    updateFilter()
    checkDrift()
    currentAngle = smoothAngle(pitch);
    updateROM(currentAngle)
    showAngle(currentAngle)
    // Send data every 100ms (10Hz)
    if (control.millis() % 100 < 20) {
        sendData()
    }
    pause(SAMPLE_PERIOD)
})
