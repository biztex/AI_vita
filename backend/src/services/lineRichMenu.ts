/**
 * LINE Rich Menu – creates and sets a default Rich Menu for the bot.
 * The menu has 3 buttons: ExecuWell, VitaAI, and Help/Settings.
 * Call setupRichMenu() once at server startup.
 */
import { lineClient } from './lineService';

const RICH_MENU_BODY = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: 'グリース メインメニュー',
  chatBarText: 'メニュー',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: {
        type: 'postback' as const,
        label: 'ExecuWell',
        data: 'select_mode=EXECUWELL',
        displayText: 'ExecuWell を使う',
      },
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: {
        type: 'postback' as const,
        label: 'VitaAI',
        data: 'select_mode=VITAAI',
        displayText: 'VitaAI を使う',
      },
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: {
        type: 'postback' as const,
        label: 'サービス切替',
        data: 'switch_mode',
        displayText: 'サービスを切り替える',
      },
    },
  ],
};


export async function setupRichMenu(): Promise<void> {
  try {
    // Check if a default rich menu already exists
    const existingDefault = await lineClient.getDefaultRichMenuId().catch(() => null);
    if (existingDefault) {
      const id = typeof existingDefault === 'string' ? existingDefault : (existingDefault as any)?.richMenuId;
      console.log('[LINE Rich Menu] Default rich menu already set:', id);
      return;
    }

    // Create the rich menu — response is { richMenuId: string }
    const response = await lineClient.createRichMenu(RICH_MENU_BODY as any);
    const richMenuId = typeof response === 'string' ? response : (response as any)?.richMenuId;
    if (!richMenuId) {
      console.warn('[LINE Rich Menu] createRichMenu returned unexpected result:', response);
      return;
    }
    console.log('[LINE Rich Menu] Created rich menu:', richMenuId);

    // LINE requires an image before a rich menu can be set as default.
    // Upload a minimal 2500x843 placeholder image, or skip if not possible.
    // For production, upload a designed PNG via LINE Developers console:
    //   curl -v -X POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content \
    //     -H "Authorization: Bearer {TOKEN}" \
    //     -H "Content-Type: image/png" \
    //     -T richmenu.png
    //
    // Then set as default:
    //   curl -X POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId} \
    //     -H "Authorization: Bearer {TOKEN}"

    try {
      await lineClient.setDefaultRichMenu(richMenuId);
      console.log('[LINE Rich Menu] Set as default rich menu');
    } catch (setErr: any) {
      // This commonly fails because no image has been uploaded yet
      console.warn(
        `[LINE Rich Menu] Created menu ${richMenuId} but could not set as default (image may be required).`,
        `Upload an image and run: curl -X POST https://api.line.me/v2/bot/user/all/richmenu/${richMenuId} -H "Authorization: Bearer <TOKEN>"`
      );
    }
  } catch (err: any) {
    // Non-fatal – bot works fine without rich menu
    console.warn('[LINE Rich Menu] Setup skipped:', err?.message || err);
  }
}
