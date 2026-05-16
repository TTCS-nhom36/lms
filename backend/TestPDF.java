import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
public class TestPDF {
    public static void main(String[] args) throws Exception {
        byte[] b = new byte[10];
        PDDocument doc = Loader.loadPDF(b);
    }
}
