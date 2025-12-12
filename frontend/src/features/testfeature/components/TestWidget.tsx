import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WidgetLayout } from "@/components/layout/WidgetLayout";

export function TestWidget() {
  const navigate = useNavigate();


  return (
    <WidgetLayout
      title="TestWidget"
      description="Test Test"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/todos")}
        >
          Öffnen
        </Button>
      }
    >
      <p className="text-base">
        Test
      </p>
    </WidgetLayout>
  );
}
