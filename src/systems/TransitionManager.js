export class TransitionManager {
  static fadeToScene(currentScene, targetScene, data = {}, duration = 500) {
    currentScene.cameras.main.fadeOut(duration, 0, 0, 0);
    currentScene.cameras.main.once('camerafadeoutcomplete', () => {
      currentScene.scene.start(targetScene, data);
    });
  }

  static fadeIn(scene, duration = 500) {
    scene.cameras.main.fadeIn(duration, 0, 0, 0);
  }
}
