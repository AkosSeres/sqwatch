import SqWatchApp from "src/sq_watch.ts";
import { AmbientLight, Color, DirectionalLight, SpotLight } from "three";
import { SqPlugin } from "./sq_plugin";

export const LightingPlugin: SqPlugin = {
    init: (app: SqWatchApp) => {
        // Set lighting
        const colorSettings = {
            ambientColor: 0x525252,
            spotlightColor: 0x525252,
            directionalColor: 0x878787,
        };
        const ambientLight = new AmbientLight(colorSettings.ambientColor);
        app.scene.add(ambientLight);
        const lightingSettings = app.gui.addFolder('Ambient light');
        lightingSettings.add(ambientLight, 'visible');
        lightingSettings.addColor(colorSettings, 'ambientColor').onChange((newColor) => { ambientLight.color = new Color(newColor); });

        const spotLight = new SpotLight(colorSettings.spotlightColor);
        spotLight.angle = Math.PI / 2;
        spotLight.penumbra = 0.2;
        spotLight.position.set(2, 3, 3);
        spotLight.castShadow = false;
        app.scene.add(spotLight);
        const spotlightSettings = app.gui.addFolder('Spotlight');
        spotlightSettings.add(spotLight, 'visible');
        spotlightSettings.add(spotLight, 'intensity', 0, 5, 0.01);
        spotlightSettings.add(spotLight, 'angle', 0, Math.PI, 0.01);
        spotlightSettings.add(spotLight, 'penumbra', 0, 1, 0.01);
        spotlightSettings.add(spotLight.position, 'x', -5, 5, 0.1).name('posX');
        spotlightSettings.add(spotLight.position, 'y', -5, 5, 0.1).name('posY');
        spotlightSettings.add(spotLight.position, 'z', 0, 5, 0.1).name('posZ');
        spotlightSettings.addColor(colorSettings, 'spotlightColor').onChange((newColor) => { spotLight.color = new Color(newColor); });

        const dirLight = new DirectionalLight(colorSettings.directionalColor);
        dirLight.position.set(-2, 3, 1.8);
        dirLight.castShadow = false;
        app.scene.add(dirLight);
        const dirSettings = app.gui.addFolder('Directional light');
        dirSettings.add(dirLight, 'visible');
        dirSettings.add(dirLight, 'intensity', 0, 5, 0.01);
        dirSettings.add(dirLight, 'castShadow').name('shadows').onChange((isShad: boolean) => { app.renderer.shadowMap.autoUpdate = isShad; });
        dirSettings.add(dirLight.position, 'x', -5, 5, 0.1).name('posX');
        dirSettings.add(dirLight.position, 'y', -5, 5, 0.1).name('posY');
        dirSettings.add(dirLight.position, 'z', 0, 5, 0.1).name('posZ');
        dirSettings.addColor(colorSettings, 'directionalColor').onChange((newColor) => { dirLight.color = new Color(newColor); });
    }
}