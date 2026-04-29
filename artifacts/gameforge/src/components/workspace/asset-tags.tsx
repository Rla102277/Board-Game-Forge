import { TagInput } from "./tag-input";
import { Card, CardContent } from "@/components/ui/card";

interface AssetTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}

export function AssetTags({ tags, onChange, suggestions = [] }: AssetTagsProps) {
  const defaultSuggestions = [
    "card", "board", "token", "meeple", "dice",
    "player-board", "resource", "character", "monster",
    "item", "weapon", "armor", "spell", "ability",
    "component", "prototype", "final", "artwork",
  ];

  const allSuggestions = [...defaultSuggestions, ...suggestions];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Asset Tags</label>
          <TagInput
            tags={tags}
            onChange={onChange}
            suggestions={allSuggestions}
            placeholder="Add tags to organize this asset..."
          />
          <p className="text-xs text-muted-foreground">
            Tags help you organize and filter assets across your project.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const ASSET_TAG_CATEGORIES = {
  type: ["card", "board", "token", "meeple", "dice", "cube", "counter"],
  purpose: ["prototype", "final", "artwork", "icon", "illustration", "photo"],
  game_element: ["character", "monster", "item", "weapon", "armor", "spell", "ability"],
  component: ["player-board", "resource", "tracker", "marker", "standee"],
  other: ["reference", "inspiration", "concept", "sketch"],
} as const;
